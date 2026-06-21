import { create } from "zustand";

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: "pending" | "success" | "error";
  statusCode?: number;
  durationMs?: number;
  errorMessage?: string;
}

interface DebugLogState {
  logs: DebugLogEntry[];
  addLog: (entry: DebugLogEntry) => void;
  updateLog: (id: string, patch: Partial<DebugLogEntry>) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 50;

export const useDebugLogStore = create<DebugLogState>((set) => ({
  logs: [],
  addLog: (entry) =>
    set((state) => ({
      logs: [entry, ...state.logs].slice(0, MAX_LOGS),
    })),
  updateLog: (id, patch) =>
    set((state) => ({
      logs: state.logs.map((log) => (log.id === id ? { ...log, ...patch } : log)),
    })),
  clearLogs: () => set({ logs: [] }),
}));

export function parseFetchInput(input: RequestInfo | URL, init?: RequestInit) {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : String(input);
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  return { url, method: method.toUpperCase() };
}

export function createFetchLogEntry(url: string, method: string): { id: string; startedAt: number } {
  const id = crypto.randomUUID();
  const startedAt = performance.now();

  useDebugLogStore.getState().addLog({
    id,
    timestamp: new Date().toISOString(),
    method,
    url,
    status: "pending",
  });

  return { id, startedAt };
}

export function completeFetchLog(id: string, startedAt: number, response: Response) {
  const durationMs = Math.round(performance.now() - startedAt);
  useDebugLogStore.getState().updateLog(id, {
    status: response.ok ? "success" : "error",
    statusCode: response.status,
    durationMs,
    errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
  });
}

export function failFetchLog(id: string, startedAt: number, error: unknown) {
  const durationMs = Math.round(performance.now() - startedAt);
  useDebugLogStore.getState().updateLog(id, {
    status: "error",
    durationMs,
    errorMessage: error instanceof Error ? error.message : String(error),
  });
}

export function useDebugLog() {
  const logs = useDebugLogStore((state) => state.logs);
  const clearLogs = useDebugLogStore((state) => state.clearLogs);
  return { logs, clearLogs };
}
