from __future__ import annotations

import io
from typing import Any

import numpy as np
import pandas as pd


def load_csv_bytes(content: bytes) -> pd.DataFrame:
    for encoding in ("utf-8", "cp949", "euc-kr", "latin-1"):
        try:
            return pd.read_csv(io.BytesIO(content), encoding=encoding, sep=None, engine="python")
        except UnicodeDecodeError:
            continue
    raise ValueError("지원되는 인코딩으로 CSV를 읽을 수 없습니다.")


def normalize_boolean_token(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    token = str(value).strip().lower().rstrip(".")
    if token in {"true", "t", "1", "yes"}:
        return "true"
    if token in {"false", "f", "0", "no"}:
        return "false"
    return None


def is_boolean_like(series: pd.Series) -> bool:
    tokens = series.dropna().map(normalize_boolean_token)
    if tokens.empty:
        return False
    if tokens.isna().any():
        return False
    return set(tokens.unique()) <= {"true", "false"}


def infer_column_type(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_numeric_dtype(series):
        return "number"
    if is_boolean_like(series):
        return "boolean"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"
    sample = series.dropna().astype(str).head(20)
    if len(sample) > 0:
        parsed = pd.to_datetime(sample, errors="coerce")
        if parsed.notna().mean() >= 0.8:
            return "date"
    return "string"


def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = df.columns.astype(str).str.strip()

    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).str.strip()
        df[col] = df[col].replace({"nan": np.nan, "None": np.nan, "": np.nan})

    for col in df.columns:
        if is_boolean_like(df[col]):
            df[col] = df[col].map(normalize_boolean_token).map({"true": True, "false": False})

    return df


def dataframe_metadata(df: pd.DataFrame) -> dict[str, Any]:
    columns = []
    for col in df.columns:
        columns.append(
            {
                "name": col,
                "type": infer_column_type(df[col]),
                "nullCount": int(df[col].isna().sum()),
                "nullPct": round(float(df[col].isna().mean() * 100), 2),
                "unique": int(df[col].nunique(dropna=True)),
            }
        )

    return {
        "rowCount": int(len(df)),
        "columnCount": int(len(df.columns)),
        "duplicateRows": int(df.duplicated().sum()),
        "columns": columns,
    }


def preview_rows(df: pd.DataFrame, limit: int = 10) -> list[dict[str, Any]]:
    sample = df.head(limit).replace({np.nan: None})
    return sample.to_dict(orient="records")


def serialize_value(value: Any) -> Any:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    return value


def summarize_numeric(df: pd.DataFrame, columns: list[str]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for col in columns:
        if col not in df.columns:
            continue
        series = pd.to_numeric(df[col], errors="coerce")
        if series.notna().sum() == 0:
            continue
        result[col] = {
            "count": int(series.count()),
            "mean": serialize_value(series.mean()),
            "median": serialize_value(series.median()),
            "std": serialize_value(series.std()),
            "min": serialize_value(series.min()),
            "max": serialize_value(series.max()),
            "q25": serialize_value(series.quantile(0.25)),
            "q75": serialize_value(series.quantile(0.75)),
            "skew": serialize_value(series.skew()),
        }
    return result


def summarize_categorical(df: pd.DataFrame, columns: list[str], top_n: int = 10) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for col in columns:
        if col not in df.columns:
            continue
        counts = df[col].value_counts(dropna=False).head(top_n)
        result[col] = {
            "unique": int(df[col].nunique(dropna=True)),
            "topValues": [
                {"value": serialize_value(idx), "count": int(cnt)}
                for idx, cnt in counts.items()
            ],
        }
    return result


def missing_analysis(df: pd.DataFrame, columns: list[str] | None = None) -> dict[str, Any]:
    target_cols = columns or df.columns.tolist()
    per_column = []
    for col in target_cols:
        if col not in df.columns:
            continue
        null_count = int(df[col].isna().sum())
        per_column.append(
            {
                "column": col,
                "nullCount": null_count,
                "nullPct": round(float(null_count / len(df) * 100), 2) if len(df) else 0,
            }
        )

    row_missing = df[target_cols].isna().sum(axis=1)
    return {
        "perColumn": sorted(per_column, key=lambda x: x["nullCount"], reverse=True),
        "rowsWithAnyMissing": int((row_missing > 0).sum()),
        "rowsWithAllMissing": int((row_missing == len(target_cols)).sum()),
    }


def correlation_matrix(df: pd.DataFrame, columns: list[str], method: str = "pearson") -> dict[str, Any]:
    numeric_df = df[columns].apply(pd.to_numeric, errors="coerce")
    numeric_df = numeric_df.dropna(axis=1, how="all")
    if numeric_df.shape[1] < 2:
        return {"columns": numeric_df.columns.tolist(), "matrix": [], "pairs": []}

    corr = numeric_df.corr(method=method)
    cols = corr.columns.tolist()
    matrix = [[serialize_value(corr.loc[r, c]) for c in cols] for r in cols]

    pairs = []
    for i, col_a in enumerate(cols):
        for j, col_b in enumerate(cols):
            if j <= i:
                continue
            value = corr.loc[col_a, col_b]
            if pd.notna(value):
                pairs.append(
                    {
                        "columnA": col_a,
                        "columnB": col_b,
                        "correlation": round(float(value), 4),
                    }
                )
    pairs.sort(key=lambda item: abs(item["correlation"]), reverse=True)

    return {"columns": cols, "matrix": matrix, "pairs": pairs[:20]}


def plot_histogram(df: pd.DataFrame, column: str, bins: int = 20) -> dict[str, Any]:
    series = pd.to_numeric(df[column], errors="coerce").dropna()
    if series.empty:
        return {"column": column, "bins": []}
    counts, edges = np.histogram(series, bins=bins)
    bins_data = [
        {
            "binStart": float(edges[i]),
            "binEnd": float(edges[i + 1]),
            "count": int(counts[i]),
            "label": f"{edges[i]:.2f}-{edges[i + 1]:.2f}",
        }
        for i in range(len(counts))
    ]
    return {"column": column, "bins": bins_data}


def plot_bar(df: pd.DataFrame, column: str, top_n: int = 15) -> dict[str, Any]:
    counts = df[column].value_counts(dropna=False).head(top_n)
    return {
        "column": column,
        "items": [
            {"label": str(serialize_value(idx)), "count": int(cnt)}
            for idx, cnt in counts.items()
        ],
    }


def plot_scatter(df: pd.DataFrame, x_column: str, y_column: str, sample_size: int = 300) -> dict[str, Any]:
    subset = df[[x_column, y_column]].copy()
    subset[x_column] = pd.to_numeric(subset[x_column], errors="coerce")
    subset[y_column] = pd.to_numeric(subset[y_column], errors="coerce")
    subset = subset.dropna()
    if len(subset) > sample_size:
        subset = subset.sample(sample_size, random_state=42)

    return {
        "xColumn": x_column,
        "yColumn": y_column,
        "points": [
            {"x": float(row[x_column]), "y": float(row[y_column])}
            for _, row in subset.iterrows()
        ],
    }


def sample_dataframe(df: pd.DataFrame, max_rows: int, method: str = "random") -> pd.DataFrame:
    if len(df) <= max_rows:
        return df.copy()
    if method == "head":
        return df.head(max_rows).copy()
    return df.sample(max_rows, random_state=42).copy()


def build_eda_prompt(
    sample_df: pd.DataFrame,
    analysis: dict[str, Any],
    *,
    total_rows: int,
    sample_rows: int = 5,
    sample_method: str = "random",
) -> str:
    preview = sample_df.head(sample_rows).replace({np.nan: "null"}).to_string(index=False)
    numeric_summary = analysis.get("numericSummary", {})
    missing = analysis.get("missing", {}).get("perColumn", [])
    corr_pairs = analysis.get("correlation", {}).get("pairs", [])[:5]
    sample_n = len(sample_df)
    method_label = "무작위 추출" if sample_method == "random" else "상위 N행"

    lines = [
        "다음 CSV 데이터를 분석하고 주요 인사이트를 한국어로 제공해주세요.",
        "응답은 마크다운 형식으로 작성하고, 데이터 패턴, 트렌드, 이상치, 비즈니스 관점의 시사점을 포함해주세요.",
        "",
        "중요: 아래 통계는 전체 데이터 기준으로 계산되었으며, 첨부된 샘플 데이터는 그 중 일부입니다.",
        f"전체 {total_rows}행 중 샘플 {sample_n}행({method_label})을 첨부했습니다.",
        "인사이트는 통계 수치에 근거해 작성하고, 샘플 데이터만으로 전체를 일반화하지 마세요.",
        "",
        f"[데이터 크기] 전체 {total_rows}행 x {len(sample_df.columns)}열",
        f"[컬럼 정보] {', '.join(sample_df.columns.astype(str).tolist())}",
        "",
        f"[샘플 데이터 — 상위 {sample_rows}행]",
        preview,
        "",
        "[수치형 요약 통계 — 전체 데이터 기준]",
        str(numeric_summary),
        "",
        "[결측치 상위 컬럼 — 전체 데이터 기준]",
        str(missing[:5]),
        "",
        "[상관관계 상위 쌍 — 전체 데이터 기준]",
        str(corr_pairs),
    ]
    return "\n".join(lines)
