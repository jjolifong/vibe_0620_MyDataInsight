from __future__ import annotations

import json
import re
import uuid
from typing import Any

import httpx
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from analysis import (
    build_eda_prompt,
    correlation_matrix,
    dataframe_metadata,
    infer_column_type,
    load_csv_bytes,
    missing_analysis,
    plot_bar,
    plot_histogram,
    plot_scatter,
    preprocess_dataframe,
    preview_rows,
    sample_dataframe,
    summarize_categorical,
    summarize_numeric,
)
from lmstudio_client import LMSTUDIO_BASE_URL, generate_insight as lmstudio_generate_insight
from ollama_client import OLLAMA_BASE_URL, OLLAMA_MODEL, generate_insight as ollama_generate_insight

app = FastAPI(title="MyDataInsight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_STORE: dict[str, pd.DataFrame] = {}


class AnalyzeRequest(BaseModel):
    sessionId: str
    columns: list[str] = Field(default_factory=list)
    correlationMethod: str = "pearson"


class PlotRequest(BaseModel):
    sessionId: str
    chartType: str
    column: str | None = None
    xColumn: str | None = None
    yColumn: str | None = None
    bins: int = 20
    topN: int = 15


class InsightsRequest(BaseModel):
    sessionId: str
    model: str
    runtime: str = "lmstudio"
    sampleRows: int = 5
    maxRows: int = 100
    samplingMethod: str = "random"


class AiAssistRequest(BaseModel):
    sessionId: str
    model: str = ""
    runtime: str = "lmstudio"
    columns: list[str] = Field(default_factory=list)
    bins: int = 20
    topN: int = 15


ALLOWED_CHART_TYPES = {"bar", "line", "area", "pie", "scatter", "bubble"}
ALLOWED_DATA_SOURCES = {"histogram", "bar", "scatter"}


def extract_json_payload(text: str) -> Any:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        object_match = re.search(r"\{[\s\S]*\}", cleaned)
        if object_match:
            return json.loads(object_match.group())
        array_match = re.search(r"\[[\s\S]*\]", cleaned)
        if array_match:
            return json.loads(array_match.group())
    raise ValueError("LLM 응답에서 JSON을 파싱할 수 없습니다.")


async def call_llm(prompt: str, model: str, runtime: str) -> dict[str, str]:
    if runtime == "ollama":
        use_model = model or OLLAMA_MODEL
        return await ollama_generate_insight(prompt, use_model)
    return await lmstudio_generate_insight(prompt, model)


def split_columns(df: pd.DataFrame, columns: list[str]) -> tuple[list[str], list[str]]:
    selected = [col for col in columns if col in df.columns]
    numeric_cols = [col for col in selected if infer_column_type(df[col]) == "number"]
    categorical_cols = [col for col in selected if col not in numeric_cols]
    return numeric_cols, categorical_cols


def fallback_chart_specs(
    numeric_cols: list[str],
    categorical_cols: list[str],
) -> list[dict[str, Any]]:
    specs: list[dict[str, Any]] = []
    if numeric_cols:
        col = numeric_cols[0]
        specs.extend(
            [
                {
                    "chartType": "bar",
                    "title": f"{col} 분포 (막대)",
                    "description": f"수치형 변수 {col}의 구간별 빈도를 막대 차트로 표현합니다.",
                    "dataSource": "histogram",
                    "column": col,
                },
                {
                    "chartType": "line",
                    "title": f"{col} 분포 (선)",
                    "description": f"{col} 값의 분포 추세를 선형 차트로 확인합니다.",
                    "dataSource": "histogram",
                    "column": col,
                },
                {
                    "chartType": "area",
                    "title": f"{col} 분포 (영역)",
                    "description": f"{col} 구간별 빈도를 영역 차트로 시각화합니다.",
                    "dataSource": "histogram",
                    "column": col,
                },
            ]
        )
    if categorical_cols:
        col = categorical_cols[0]
        specs.extend(
            [
                {
                    "chartType": "bar",
                    "title": f"{col} 범주 빈도",
                    "description": f"범주형 변수 {col}의 상위 빈도를 막대 차트로 비교합니다.",
                    "dataSource": "bar",
                    "column": col,
                },
                {
                    "chartType": "pie",
                    "title": f"{col} 범주 비율",
                    "description": f"{col} 각 범주의 비중을 파이 차트로 표현합니다.",
                    "dataSource": "bar",
                    "column": col,
                },
            ]
        )
    if len(numeric_cols) >= 2:
        specs.extend(
            [
                {
                    "chartType": "scatter",
                    "title": f"{numeric_cols[0]} vs {numeric_cols[1]}",
                    "description": "두 수치형 변수 간 관계를 산점도로 확인합니다.",
                    "dataSource": "scatter",
                    "xColumn": numeric_cols[0],
                    "yColumn": numeric_cols[1],
                },
                {
                    "chartType": "bubble",
                    "title": f"{numeric_cols[0]}·{numeric_cols[1]} 버블",
                    "description": "산점도 관계를 버블 차트로 강조합니다.",
                    "dataSource": "scatter",
                    "xColumn": numeric_cols[0],
                    "yColumn": numeric_cols[1],
                },
            ]
        )
    return specs[:6] if len(specs) >= 3 else specs


def normalize_chart_spec(
    spec: dict[str, Any],
    numeric_cols: list[str],
    categorical_cols: list[str],
) -> dict[str, Any] | None:
    chart_type = str(spec.get("chartType", "")).lower()
    data_source = str(spec.get("dataSource", "")).lower()
    if chart_type not in ALLOWED_CHART_TYPES:
        return None

    title = str(spec.get("title") or "추천 차트").strip()
    description = str(spec.get("description") or "데이터 특성에 맞춘 추천 차트입니다.").strip()

    if chart_type in {"bar", "line", "area"} and not data_source:
        data_source = "histogram"
    if chart_type == "pie" and not data_source:
        data_source = "bar"
    if chart_type in {"scatter", "bubble"} and not data_source:
        data_source = "scatter"

    if data_source not in ALLOWED_DATA_SOURCES:
        return None

    if data_source == "histogram":
        column = spec.get("column")
        if column not in numeric_cols:
            column = numeric_cols[0] if numeric_cols else None
        if not column:
            return None
        if chart_type == "pie":
            chart_type = "bar"
        if chart_type not in {"bar", "line", "area"}:
            chart_type = "bar"
        return {
            "chartType": chart_type,
            "title": title,
            "description": description,
            "dataSource": "histogram",
            "column": column,
        }

    if data_source == "bar":
        column = spec.get("column")
        if column not in categorical_cols:
            column = categorical_cols[0] if categorical_cols else None
        if not column:
            return None
        if chart_type in {"line", "area"}:
            chart_type = "bar"
        if chart_type not in {"bar", "pie"}:
            chart_type = "bar"
        return {
            "chartType": chart_type,
            "title": title,
            "description": description,
            "dataSource": "bar",
            "column": column,
        }

    x_column = spec.get("xColumn")
    y_column = spec.get("yColumn")
    if x_column not in numeric_cols or y_column not in numeric_cols or x_column == y_column:
        if len(numeric_cols) < 2:
            return None
        x_column, y_column = numeric_cols[0], numeric_cols[1]
    if chart_type not in {"scatter", "bubble"}:
        chart_type = "scatter"
    return {
        "chartType": chart_type,
        "title": title,
        "description": description,
        "dataSource": "scatter",
        "xColumn": x_column,
        "yColumn": y_column,
    }


def build_plot_payload(
    df: pd.DataFrame,
    spec: dict[str, Any],
    *,
    bins: int,
    top_n: int,
) -> dict[str, Any]:
    source = spec["dataSource"]
    if source == "histogram":
        return plot_histogram(df, spec["column"], bins=bins)
    if source == "bar":
        return plot_bar(df, spec["column"], top_n=top_n)
    return plot_scatter(df, spec["xColumn"], spec["yColumn"])


def fallback_questions(columns: list[str], numeric_cols: list[str], categorical_cols: list[str]) -> list[str]:
    primary = columns[0] if columns else "데이터"
    questions = [
        f"{primary} 컬럼의 분포 특성과 이상치는 무엇인가요?",
        "결측치가 많은 컬럼은 무엇이며 분석에 어떤 영향을 주나요?",
        "수치형 변수들 간에 강한 상관관계가 있는 조합은 무엇인가요?",
        f"{categorical_cols[0]} 값별로 다른 패턴이 관찰되나요?" if categorical_cols else "범주형 변수에서 두드러지는 그룹은 무엇인가요?",
        "데이터 품질 측면에서 추가로 정제해야 할 항목은 무엇인가요?",
        "비즈니스 관점에서 우선 확인해야 할 핵심 지표는 무엇인가요?",
    ]
    if numeric_cols:
        questions[2] = f"{numeric_cols[0]}와 다른 수치형 변수 간 관계를 어떻게 해석할 수 있나요?"
    return questions[:6]


def build_dataset_context(df: pd.DataFrame, columns: list[str]) -> str:
    metadata = dataframe_metadata(df)
    selected_meta = [item for item in metadata["columns"] if item["name"] in columns]
    numeric_cols, categorical_cols = split_columns(df, columns)
    numeric_summary = summarize_numeric(df, numeric_cols)
    categorical_summary = summarize_categorical(df, categorical_cols, top_n=5)
    return json.dumps(
        {
            "rowCount": metadata["rowCount"],
            "columns": selected_meta,
            "numericSummary": numeric_summary,
            "categoricalSummary": categorical_summary,
            "numericColumns": numeric_cols,
            "categoricalColumns": categorical_cols,
        },
        ensure_ascii=False,
    )


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/models")
async def list_models(runtime: str = "lmstudio") -> dict[str, Any]:
    if runtime == "ollama":
        url = f"{OLLAMA_BASE_URL}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                payload = response.json()
            models = payload.get("models", [])
            return {
                "data": [
                    {"id": name}
                    for item in models
                    if (name := item.get("name") or item.get("model"))
                ],
            }
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=503,
                detail="Ollama 서버에 연결할 수 없습니다. localhost:11434에서 ollama serve를 실행해주세요.",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Ollama models API 오류: {exc.response.text}",
            ) from exc

    url = f"{LMSTUDIO_BASE_URL}/v1/models"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except httpx.ConnectError as exc:
        raise HTTPException(
            status_code=503,
            detail="LM Studio 서버에 연결할 수 없습니다. localhost:1234에서 서버를 실행해주세요.",
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"LM Studio models API 오류: {exc.response.text}",
        ) from exc


@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV 파일만 업로드할 수 있습니다.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    try:
        df_raw = load_csv_bytes(content)
        df = preprocess_dataframe(df_raw)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"CSV 파싱 실패: {exc}") from exc

    session_id = str(uuid.uuid4())
    DATA_STORE[session_id] = df

    metadata = dataframe_metadata(df)
    return {
        "sessionId": session_id,
        "filename": file.filename,
        "metadata": metadata,
        "preview": preview_rows(df, limit=10),
    }


@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest) -> dict[str, Any]:
    df = DATA_STORE.get(request.sessionId)
    if df is None:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다. 파일을 다시 업로드해주세요.")

    selected = request.columns or df.columns.tolist()
    selected = [col for col in selected if col in df.columns]
    if not selected:
        raise HTTPException(status_code=400, detail="분석할 컬럼이 없습니다.")

    numeric_cols = [
        col
        for col in selected
        if infer_column_type(df[col]) == "number"
    ]
    categorical_cols = [col for col in selected if col not in numeric_cols]

    numeric_summary = summarize_numeric(df, numeric_cols)
    categorical_summary = summarize_categorical(df, categorical_cols)
    missing = missing_analysis(df, selected)
    correlation = correlation_matrix(df, numeric_cols, method=request.correlationMethod)

    return {
        "numericSummary": numeric_summary,
        "categoricalSummary": categorical_summary,
        "missing": missing,
        "correlation": correlation,
        "selectedColumns": selected,
    }


def infer_column_type_safe(df: pd.DataFrame, col: str) -> str:
    return infer_column_type(df[col])


def get_numeric_columns(df: pd.DataFrame, columns: list[str] | None = None) -> list[str]:
    target = columns or df.columns.tolist()
    return [col for col in target if col in df.columns and infer_column_type(df[col]) == "number"]


@app.post("/api/plot-data")
async def plot_data(request: PlotRequest) -> dict[str, Any]:
    df = DATA_STORE.get(request.sessionId)
    if df is None:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    chart_type = request.chartType.lower()
    if chart_type == "histogram":
        if not request.column:
            raise HTTPException(status_code=400, detail="histogram 차트에는 column이 필요합니다.")
        return {"chartType": chart_type, "data": plot_histogram(df, request.column, bins=request.bins)}

    if chart_type == "bar":
        if not request.column:
            raise HTTPException(status_code=400, detail="bar 차트에는 column이 필요합니다.")
        return {"chartType": chart_type, "data": plot_bar(df, request.column, top_n=request.topN)}

    if chart_type == "scatter":
        if not request.xColumn or not request.yColumn:
            raise HTTPException(status_code=400, detail="scatter 차트에는 xColumn, yColumn이 필요합니다.")
        return {
            "chartType": chart_type,
            "data": plot_scatter(df, request.xColumn, request.yColumn),
        }

    raise HTTPException(status_code=400, detail=f"지원하지 않는 차트 유형: {request.chartType}")


@app.post("/api/insights")
async def insights(request: InsightsRequest) -> dict[str, Any]:
    df = DATA_STORE.get(request.sessionId)
    if df is None:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    total_rows = len(df)
    sampling_method = request.samplingMethod if request.samplingMethod in {"random", "head"} else "random"
    sampled_df = sample_dataframe(df, request.maxRows, method=sampling_method)
    numeric_cols = get_numeric_columns(df)

    analysis_payload = {
        "numericSummary": summarize_numeric(df, numeric_cols),
        "missing": missing_analysis(df),
        "correlation": correlation_matrix(df, numeric_cols),
    }

    prompt = build_eda_prompt(
        sampled_df,
        analysis_payload,
        total_rows=total_rows,
        sample_rows=request.sampleRows,
        sample_method=sampling_method,
    )

    runtime = request.runtime if request.runtime in {"lmstudio", "ollama"} else "lmstudio"
    if runtime == "ollama":
        model = request.model or OLLAMA_MODEL
        result = await ollama_generate_insight(prompt, model)
    else:
        result = await lmstudio_generate_insight(prompt, request.model)

    return {
        "promptPreview": prompt[:500] + ("..." if len(prompt) > 500 else ""),
        "insight": result["content"],
        "model": result["model"],
        "status": result["status"],
        "runtime": runtime,
        "meta": {
            "totalRows": total_rows,
            "sampleRows": len(sampled_df),
            "samplingMethod": sampling_method,
        },
    }


@app.post("/api/recommend-charts")
async def recommend_charts(request: AiAssistRequest) -> dict[str, Any]:
    df = DATA_STORE.get(request.sessionId)
    if df is None:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    columns = request.columns or df.columns.tolist()
    columns = [col for col in columns if col in df.columns]
    if not columns:
        raise HTTPException(status_code=400, detail="차트 추천을 위한 컬럼이 없습니다.")

    numeric_cols, categorical_cols = split_columns(df, columns)
    context = build_dataset_context(df, columns)
    runtime = request.runtime if request.runtime in {"lmstudio", "ollama"} else "lmstudio"
    status = "ok"
    specs: list[dict[str, Any]] = []

    prompt = (
        "당신은 데이터 시각화 전문가입니다. 아래 JSON 데이터셋 정보를 보고 3~6개의 차트를 추천하세요.\n"
        "chartType은 bar, line, area, pie, scatter, bubble 중에서만 선택하세요.\n"
        "수치형 컬럼은 dataSource=histogram + column, 범주형 컬럼은 dataSource=bar + column,\n"
        "scatter/bubble은 dataSource=scatter + xColumn/yColumn(서로 다른 수치형 컬럼)을 사용하세요.\n"
        "각 항목에 한국어 title과 description을 포함하세요.\n"
        '응답은 JSON만 반환: {"charts":[{...}]}\n\n'
        f"DATASET:\n{context}"
    )

    try:
        llm_result = await call_llm(prompt, request.model, runtime)
        if llm_result["status"] == "ok" and llm_result["content"]:
            payload = extract_json_payload(llm_result["content"])
            raw_specs = payload.get("charts", payload if isinstance(payload, list) else [])
            if isinstance(raw_specs, list):
                for item in raw_specs:
                    if not isinstance(item, dict):
                        continue
                    normalized = normalize_chart_spec(item, numeric_cols, categorical_cols)
                    if normalized and normalized not in specs:
                        specs.append(normalized)
                    if len(specs) >= 6:
                        break
        else:
            status = llm_result["status"]
    except (ValueError, json.JSONDecodeError):
        status = "fallback"

    if len(specs) < 3:
        status = "fallback" if status != "ok" else status
        specs = fallback_chart_specs(numeric_cols, categorical_cols)

    charts: list[dict[str, Any]] = []
    for spec in specs[:6]:
        try:
            plot_data = build_plot_payload(df, spec, bins=request.bins, top_n=request.topN)
            if spec["dataSource"] == "histogram" and not plot_data.get("bins"):
                continue
            if spec["dataSource"] == "bar" and not plot_data.get("items"):
                continue
            if spec["dataSource"] == "scatter" and not plot_data.get("points"):
                continue
            charts.append({**spec, "plotData": plot_data})
        except Exception:  # noqa: BLE001
            continue

    if len(charts) < 3:
        charts = []
        for spec in fallback_chart_specs(numeric_cols, categorical_cols):
            plot_data = build_plot_payload(df, spec, bins=request.bins, top_n=request.topN)
            charts.append({**spec, "plotData": plot_data})
            if len(charts) >= 6:
                break

    return {"charts": charts[:6], "status": status if charts else "empty"}


@app.post("/api/suggest-questions")
async def suggest_questions(request: AiAssistRequest) -> dict[str, Any]:
    df = DATA_STORE.get(request.sessionId)
    if df is None:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    columns = request.columns or df.columns.tolist()
    columns = [col for col in columns if col in df.columns]
    if not columns:
        raise HTTPException(status_code=400, detail="질문 생성을 위한 컬럼이 없습니다.")

    numeric_cols, categorical_cols = split_columns(df, columns)
    context = build_dataset_context(df, columns)
    runtime = request.runtime if request.runtime in {"lmstudio", "ollama"} else "lmstudio"
    status = "ok"
    questions: list[str] = []

    prompt = (
        "당신은 데이터 분석 보조 AI입니다. 아래 JSON 데이터셋 정보를 보고 사용자가 물어볼 만한 "
        "분석 질문 6개를 한국어로 작성하세요.\n"
        '응답은 JSON만 반환: {"questions":["질문1","질문2","질문3","질문4","질문5","질문6"]}\n\n'
        f"DATASET:\n{context}"
    )

    try:
        llm_result = await call_llm(prompt, request.model, runtime)
        if llm_result["status"] == "ok" and llm_result["content"]:
            payload = extract_json_payload(llm_result["content"])
            raw_questions = payload.get("questions", payload if isinstance(payload, list) else [])
            if isinstance(raw_questions, list):
                questions = [str(item).strip() for item in raw_questions if str(item).strip()]
        else:
            status = llm_result["status"]
    except (ValueError, json.JSONDecodeError):
        status = "fallback"

    if len(questions) < 6:
        status = "fallback" if status != "ok" else status
        fallback = fallback_questions(columns, numeric_cols, categorical_cols)
        for item in fallback:
            if item not in questions:
                questions.append(item)
            if len(questions) >= 6:
                break

    return {"questions": questions[:6], "status": status if questions else "empty"}
