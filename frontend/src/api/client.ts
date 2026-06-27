import type {
  AnalysisResult,
  BarData,
  HistogramData,
  InsightResponse,
  RecommendChartsResponse,
  ScatterData,
  SuggestQuestionsResponse,
  UploadResponse,
} from "../types";

const API_BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    let message = `요청 실패: ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function uploadCsv(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return request<UploadResponse>("/upload", {
    method: "POST",
    body: formData,
  });
}

export async function analyzeData(
  sessionId: string,
  columns: string[],
  correlationMethod: string,
): Promise<AnalysisResult> {
  return request<AnalysisResult>("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, columns, correlationMethod }),
  });
}

export async function fetchPlotData<T>(payload: {
  sessionId: string;
  chartType: "histogram" | "bar" | "scatter";
  column?: string;
  xColumn?: string;
  yColumn?: string;
  bins?: number;
  topN?: number;
}): Promise<{ chartType: string; data: T }> {
  return request("/plot-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function requestInsights(
  sessionId: string,
  sampleRows: number,
  maxRows: number,
  samplingMethod: "random" | "head",
): Promise<InsightResponse> {
  return request<InsightResponse>("/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, sampleRows, maxRows, samplingMethod }),
  });
}

export async function recommendCharts(payload: {
  sessionId: string;
  model: string;
  runtime: string;
  columns: string[];
  bins?: number;
  topN?: number;
}): Promise<RecommendChartsResponse> {
  return request<RecommendChartsResponse>("/recommend-charts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function suggestQuestions(payload: {
  sessionId: string;
  model: string;
  runtime: string;
  columns: string[];
}): Promise<SuggestQuestionsResponse> {
  return request<SuggestQuestionsResponse>("/suggest-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>("/health");
    return true;
  } catch {
    return false;
  }
}

export type { HistogramData, BarData, ScatterData };
