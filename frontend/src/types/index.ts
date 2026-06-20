export type ColumnType = "number" | "string" | "boolean" | "date";

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  nullCount: number;
  nullPct: number;
  unique: number;
}

export interface DatasetMetadata {
  rowCount: number;
  columnCount: number;
  duplicateRows: number;
  columns: ColumnMeta[];
}

export interface UploadResponse {
  sessionId: string;
  filename: string;
  metadata: DatasetMetadata;
  preview: Record<string, unknown>[];
}

export interface NumericSummary {
  count: number;
  mean: number | null;
  median: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  q25: number | null;
  q75: number | null;
  skew: number | null;
}

export interface AnalysisResult {
  numericSummary: Record<string, NumericSummary>;
  categoricalSummary: Record<string, { unique: number; topValues: { value: unknown; count: number }[] }>;
  missing: {
    perColumn: { column: string; nullCount: number; nullPct: number }[];
    rowsWithAnyMissing: number;
    rowsWithAllMissing: number;
  };
  correlation: {
    columns: string[];
    matrix: (number | null)[][];
    pairs: { columnA: string; columnB: string; correlation: number }[];
  };
  selectedColumns: string[];
}

export interface InsightResponse {
  promptPreview: string;
  insight: string;
  model: string;
  status: string;
  meta?: {
    totalRows: number;
    sampleRows: number;
    samplingMethod: string;
  };
}

export interface AppSettings {
  previewRows: number;
  chartBins: number;
  chartTopN: number;
  correlationMethod: "pearson" | "spearman";
  samplingMethod: "random" | "head";
  insightSampleRows: number;
  insightMaxRows: number;
  language: "ko" | "en";
}

export interface HistogramData {
  column: string;
  bins: { binStart: number; binEnd: number; count: number; label: string }[];
}

export interface BarData {
  column: string;
  items: { label: string; count: number }[];
}

export interface ScatterData {
  xColumn: string;
  yColumn: string;
  points: { x: number; y: number }[];
}
