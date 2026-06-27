import Papa from "papaparse";
import { create } from "zustand";
import { uploadCsv } from "../api/client";
import type { AnalysisResult, AppSettings, DatasetMetadata, InsightResponse } from "../types";

export const SELECTED_MODEL_KEY = "mydatainsight.lmstudioModel";
export const FILE_STORAGE_PREFIX = "mydatainsight.file.";
export const LEGACY_SESSION_STORAGE_KEY = "mydatainsight.session";
export const STORAGE_LIMIT_MB = 5;

export interface SavedAnalysisEntry {
  storageKey: string;
  filename: string;
  sizeKb: number;
  savedAt: string;
}

interface PersistedSession {
  version: 1;
  filename: string;
  savedAt: string;
  metadata: DatasetMetadata;
  preview: Record<string, unknown>[];
  clientRows: Record<string, unknown>[];
  qualityIssues: string[];
  selectedColumns: string[];
  analysis: AnalysisResult | null;
  insight: InsightResponse | null;
  activeStep: "upload" | "preview" | "analysis";
}

function readStoredModel(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(SELECTED_MODEL_KEY) ?? "";
}

function getEntrySizeKb(key: string, value: string): number {
  const bytes = new Blob([key]).size + new Blob([value]).size;
  return Math.round((bytes / 1024) * 10) / 10;
}

export function filenameToStorageKey(filename: string): string {
  const base = filename.replace(/\.csv$/i, "").trim() || filename.trim();
  return `${FILE_STORAGE_PREFIX}${base}`;
}

export function calculateLocalStorageUsageKb(): number {
  if (typeof localStorage === "undefined") return 0;
  let bytes = 0;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) ?? "";
    bytes += new Blob([key]).size + new Blob([value]).size;
  }
  return Math.round((bytes / 1024) * 10) / 10;
}

export function getStorageQuotaInfo(): { usedKb: number; limitMb: number } {
  return {
    usedKb: calculateLocalStorageUsageKb(),
    limitMb: STORAGE_LIMIT_MB,
  };
}

function parsePersistedSession(raw: string): PersistedSession | null {
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed.version !== 1 || !parsed.filename || !Array.isArray(parsed.clientRows) || !parsed.analysis) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readPersistedSessionByKey(storageKey: string): PersistedSession | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  return parsePersistedSession(raw);
}

function migrateLegacySessionStorage() {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
  if (!raw) return;

  const parsed = parsePersistedSession(raw);
  if (parsed) {
    const storageKey = filenameToStorageKey(parsed.filename);
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, JSON.stringify({ ...parsed, savedAt: parsed.savedAt || new Date().toISOString() }));
    }
  }

  localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
}

export function listSavedAnalysisEntries(): SavedAnalysisEntry[] {
  if (typeof localStorage === "undefined") return [];
  migrateLegacySessionStorage();

  const entries: SavedAnalysisEntry[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const storageKey = localStorage.key(i);
    if (!storageKey?.startsWith(FILE_STORAGE_PREFIX)) continue;
    const raw = localStorage.getItem(storageKey);
    if (!raw) continue;

    const parsed = parsePersistedSession(raw);
    if (!parsed) continue;

    entries.push({
      storageKey,
      filename: parsed.filename,
      sizeKb: getEntrySizeKb(storageKey, raw),
      savedAt: parsed.savedAt,
    });
  }

  return entries.sort((a, b) => b.sizeKb - a.sizeKb);
}

function readMostRecentPersistedSession(): { storageKey: string; data: PersistedSession } | null {
  const entries = listSavedAnalysisEntries();
  if (entries.length === 0) return null;

  const sortedByDate = [...entries].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
  const latest = sortedByDate[0];
  const data = readPersistedSessionByKey(latest.storageKey);
  if (!data) return null;
  return { storageKey: latest.storageKey, data };
}

function writePersistedSession(state: AppState) {
  if (typeof localStorage === "undefined") return;
  if (!state.filename || state.clientRows.length === 0 || !state.analysis || !state.metadata) return;

  const payload: PersistedSession = {
    version: 1,
    filename: state.filename,
    savedAt: new Date().toISOString(),
    metadata: state.metadata,
    preview: state.preview,
    clientRows: state.clientRows,
    qualityIssues: state.qualityIssues,
    selectedColumns: state.selectedColumns,
    analysis: state.analysis,
    insight: state.insight,
    activeStep: state.activeStep,
  };

  localStorage.setItem(filenameToStorageKey(state.filename), JSON.stringify(payload));
}

function clearPersistedSessionForFilename(filename: string | null) {
  if (typeof localStorage === "undefined" || !filename) return;
  localStorage.removeItem(filenameToStorageKey(filename));
}

function syncStorageUsage(set: (partial: Partial<AppState>) => void) {
  set({ storageUsageKb: calculateLocalStorageUsageKb() });
}

function maybePersistSession(state: AppState) {
  if (!state.filename || state.clientRows.length === 0 || !state.analysis) return;
  writePersistedSession(state);
}

async function restorePersistedSession(persisted: PersistedSession): Promise<void> {
  isHydrating = true;
  useAppStore.setState({
    filename: persisted.filename,
    metadata: persisted.metadata,
    preview: persisted.preview,
    clientRows: persisted.clientRows,
    qualityIssues: persisted.qualityIssues,
    selectedColumns: persisted.selectedColumns,
    analysis: persisted.analysis,
    insight: persisted.insight,
    activeStep: persisted.activeStep,
    loading: true,
    error: null,
    storageUsageKb: calculateLocalStorageUsageKb(),
  });

  try {
    const csvText = Papa.unparse(persisted.clientRows);
    const file = new File([csvText], persisted.filename, { type: "text/csv" });
    const result = await uploadCsv(file);
    useAppStore.setState({
      sessionId: result.sessionId,
      filename: result.filename,
      metadata: result.metadata,
      preview: result.preview,
      loading: false,
    });
  } catch (error) {
    useAppStore.setState({
      loading: false,
      error: error instanceof Error ? error.message : "저장된 데이터 복원에 실패했습니다.",
    });
  } finally {
    isHydrating = false;
    useAppStore.setState({ storageUsageKb: calculateLocalStorageUsageKb() });
  }
}

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
  selectedModel: string;
  storageUsageKb: number;
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
  setSelectedModel: (model: string) => void;
  setLoading: (loading: boolean) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setInsightLoading: (insightLoading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveStep: (step: "upload" | "preview" | "analysis") => void;
  reset: () => void;
  clearStoredAnalysisData: () => void;
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

const initialAnalysisState = {
  sessionId: null,
  filename: null,
  metadata: null,
  preview: [] as Record<string, unknown>[],
  clientRows: [] as Record<string, unknown>[],
  qualityIssues: [] as string[],
  selectedColumns: [] as string[],
  analysis: null,
  insight: null,
  activeStep: "upload" as const,
};

let isHydrating = false;
let hydratePromise: Promise<void> | null = null;

export async function hydrateFromStorage(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    migrateLegacySessionStorage();
    const latest = readMostRecentPersistedSession();
    if (!latest) {
      useAppStore.setState({ storageUsageKb: calculateLocalStorageUsageKb() });
      return;
    }

    await restorePersistedSession(latest.data);
  })();

  return hydratePromise;
}

export async function loadSavedAnalysis(storageKey: string): Promise<void> {
  const persisted = readPersistedSessionByKey(storageKey);
  if (!persisted) {
    throw new Error("저장된 분석 데이터를 찾을 수 없습니다.");
  }
  await restorePersistedSession(persisted);
}

export function deleteSavedAnalysis(storageKey: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(storageKey);
  useAppStore.setState({ storageUsageKb: calculateLocalStorageUsageKb() });
}

export function formatSavedAt(savedAt: string): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initialAnalysisState,
  settings: defaultSettings,
  selectedModel: readStoredModel(),
  storageUsageKb: typeof localStorage !== "undefined" ? calculateLocalStorageUsageKb() : 0,
  loading: false,
  analyzing: false,
  insightLoading: false,
  error: null,
  setUploadResult: ({ sessionId, filename, metadata, preview }) => {
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
    });
  },
  setClientParse: ({ rows, qualityIssues }) => {
    set({
      clientRows: rows,
      qualityIssues,
    });
  },
  setSelectedColumns: (columns) => {
    set({ selectedColumns: columns });
    maybePersistSession(get());
    syncStorageUsage(set);
  },
  toggleColumn: (column) => {
    const current = get().selectedColumns;
    if (current.includes(column)) {
      set({ selectedColumns: current.filter((item) => item !== column) });
    } else {
      set({ selectedColumns: [...current, column] });
    }
    maybePersistSession(get());
    syncStorageUsage(set);
  },
  setAnalysis: (analysis) => {
    set({ analysis, activeStep: "analysis" });
    maybePersistSession(get());
    syncStorageUsage(set);
  },
  setInsight: (insight) => {
    set({ insight });
    maybePersistSession(get());
    syncStorageUsage(set);
  },
  updateSettings: (settings) => set({ settings: { ...get().settings, ...settings } }),
  setSelectedModel: (model) => {
    localStorage.setItem(SELECTED_MODEL_KEY, model);
    set({ selectedModel: model });
    syncStorageUsage(set);
  },
  setLoading: (loading) => set({ loading }),
  setAnalyzing: (analyzing) => set({ analyzing }),
  setInsightLoading: (insightLoading) => set({ insightLoading }),
  setError: (error) => set({ error }),
  setActiveStep: (step) => {
    set({ activeStep: step });
    maybePersistSession(get());
    syncStorageUsage(set);
  },
  reset: () => {
    set({
      ...initialAnalysisState,
      loading: false,
      analyzing: false,
      insightLoading: false,
      error: null,
    });
    syncStorageUsage(set);
  },
  clearStoredAnalysisData: () => {
    clearPersistedSessionForFilename(get().filename);
    set({
      ...initialAnalysisState,
      error: null,
    });
    syncStorageUsage(set);
  },
}));

useAppStore.subscribe((state) => {
  if (isHydrating) return;
  maybePersistSession(state);
  const usage = calculateLocalStorageUsageKb();
  if (usage !== state.storageUsageKb) {
    useAppStore.setState({ storageUsageKb: usage });
  }
});
