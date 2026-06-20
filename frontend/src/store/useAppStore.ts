import { create } from "zustand";
import type { AnalysisResult, AppSettings, DatasetMetadata, InsightResponse } from "../types";

interface AppState {
  sessionId: string | null;
  filename: string | null;
  metadata: DatasetMetadata | null;
  preview: Record<string, unknown>[];
  clientRows: Record<string, unknown>[];
  qualityIssues: string[];
  selectedColumns: string[];
  analysis: AnalysisResult | null;
  insight: InsightResponse | null;
  settings: AppSettings;
  loading: boolean;
  analyzing: boolean;
  insightLoading: boolean;
  error: string | null;
  activeStep: "upload" | "preview" | "analysis";
  setUploadResult: (payload: {
    sessionId: string;
    filename: string;
    metadata: DatasetMetadata;
    preview: Record<string, unknown>[];
  }) => void;
  setClientParse: (payload: {
    rows: Record<string, unknown>[];
    qualityIssues: string[];
  }) => void;
  setSelectedColumns: (columns: string[]) => void;
  toggleColumn: (column: string) => void;
  setAnalysis: (analysis: AnalysisResult | null) => void;
  setInsight: (insight: InsightResponse | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setLoading: (loading: boolean) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setInsightLoading: (insightLoading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveStep: (step: "upload" | "preview" | "analysis") => void;
  reset: () => void;
}

const defaultSettings: AppSettings = {
  previewRows: 10,
  chartBins: 20,
  chartTopN: 15,
  correlationMethod: "pearson",
  samplingMethod: "random",
  insightSampleRows: 5,
  insightMaxRows: 100,
  language: "ko",
};

export const useAppStore = create<AppState>((set, get) => ({
  sessionId: null,
  filename: null,
  metadata: null,
  preview: [],
  clientRows: [],
  qualityIssues: [],
  selectedColumns: [],
  analysis: null,
  insight: null,
  settings: defaultSettings,
  loading: false,
  analyzing: false,
  insightLoading: false,
  error: null,
  activeStep: "upload",
  setUploadResult: ({ sessionId, filename, metadata, preview }) =>
    set({
      sessionId,
      filename,
      metadata,
      preview,
      selectedColumns: metadata.columns.map((col) => col.name),
      analysis: null,
      insight: null,
      error: null,
      activeStep: "preview",
    }),
  setClientParse: ({ rows, qualityIssues }) =>
    set({
      clientRows: rows,
      qualityIssues,
    }),
  setSelectedColumns: (columns) => set({ selectedColumns: columns }),
  toggleColumn: (column) => {
    const current = get().selectedColumns;
    if (current.includes(column)) {
      set({ selectedColumns: current.filter((item) => item !== column) });
    } else {
      set({ selectedColumns: [...current, column] });
    }
  },
  setAnalysis: (analysis) => set({ analysis, activeStep: "analysis" }),
  setInsight: (insight) => set({ insight }),
  updateSettings: (settings) => set({ settings: { ...get().settings, ...settings } }),
  setLoading: (loading) => set({ loading }),
  setAnalyzing: (analyzing) => set({ analyzing }),
  setInsightLoading: (insightLoading) => set({ insightLoading }),
  setError: (error) => set({ error }),
  setActiveStep: (step) => set({ activeStep: step }),
  reset: () =>
    set({
      sessionId: null,
      filename: null,
      metadata: null,
      preview: [],
      clientRows: [],
      qualityIssues: [],
      selectedColumns: [],
      analysis: null,
      insight: null,
      loading: false,
      analyzing: false,
      insightLoading: false,
      error: null,
      activeStep: "upload",
    }),
}));
