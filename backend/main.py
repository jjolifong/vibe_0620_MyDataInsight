from __future__ import annotations

import uuid
from typing import Any

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
from ollama_client import generate_insight

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
    sampleRows: int = 5
    maxRows: int = 100
    samplingMethod: str = "random"


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


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
    result = await generate_insight(prompt)

    return {
        "promptPreview": prompt[:500] + ("..." if len(prompt) > 500 else ""),
        "insight": result["content"],
        "model": result["model"],
        "status": result["status"],
        "meta": {
            "totalRows": total_rows,
            "sampleRows": len(sampled_df),
            "samplingMethod": sampling_method,
        },
    }
