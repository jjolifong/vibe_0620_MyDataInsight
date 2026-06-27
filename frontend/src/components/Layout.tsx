import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { checkHealth } from "../api/client";
import {
  calculateLocalStorageUsageKb,
  deleteSavedAnalysis,
  formatSavedAt,
  getStorageQuotaInfo,
  hydrateFromStorage,
  listSavedAnalysisEntries,
  loadSavedAnalysis,
  type SavedAnalysisEntry,
  useAppStore,
} from "../store/useAppStore";

export default function Layout() {
  const { error, reset, filename, storageUsageKb, clearStoredAnalysisData } = useAppStore();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [savedEntries, setSavedEntries] = useState<SavedAnalysisEntry[]>([]);
  const [listLoadingKey, setListLoadingKey] = useState<string | null>(null);

  const refreshSavedEntries = () => {
    setSavedEntries(listSavedAnalysisEntries());
    useAppStore.setState({ storageUsageKb: calculateLocalStorageUsageKb() });
  };

  useEffect(() => {
    void checkHealth().then(setBackendOnline);
    void hydrateFromStorage();
  }, []);

  useEffect(() => {
    const refreshUsage = () => {
      refreshSavedEntries();
    };

    window.addEventListener("storage", refreshUsage);
    return () => {
      window.removeEventListener("storage", refreshUsage);
    };
  }, []);

  useEffect(() => {
    if (listOpen) {
      refreshSavedEntries();
    }
  }, [listOpen]);

  const quota = getStorageQuotaInfo();

  const handleClearStoredData = () => {
    const confirmed = window.confirm(
      "현재 작업 중인 분석 데이터를 삭제할까요?\n저장된 분석 목록의 다른 파일은 유지됩니다.",
    );
    if (!confirmed) return;
    clearStoredAnalysisData();
    if (listOpen) refreshSavedEntries();
  };

  const handleLoadSaved = async (storageKey: string) => {
    setListLoadingKey(storageKey);
    useAppStore.setState({ error: null });
    try {
      await loadSavedAnalysis(storageKey);
      setListOpen(false);
      refreshSavedEntries();
    } catch (loadError) {
      useAppStore.setState({
        error: loadError instanceof Error ? loadError.message : "저장된 분석을 불러오지 못했습니다.",
      });
    } finally {
      setListLoadingKey(null);
    }
  };

  const handleDeleteSaved = (entry: SavedAnalysisEntry) => {
    const confirmed = window.confirm(`"${entry.filename}" 저장 항목을 삭제할까요?`);
    if (!confirmed) return;
    deleteSavedAnalysis(entry.storageKey);
    refreshSavedEntries();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-700">MyDataInsight</h1>
            <p className="text-sm text-slate-500">EXAONE 로컬 LLM 기반 CSV 데이터 분석</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>
                현재 파일:{" "}
                <span className="font-medium text-slate-800">{filename ?? "없음"}</span>
              </span>
              <span>
                로컬 스토리지: <span className="font-medium text-slate-800">{storageUsageKb} KB</span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                backendOnline ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              백엔드 {backendOnline ? "연결됨" : backendOnline === false ? "오프라인" : "확인 중"}
            </span>
            <button className="btn-secondary" onClick={() => setListOpen(true)}>
              저장된 분석 목록
            </button>
            <button className="btn-secondary" onClick={handleClearStoredData}>
              저장 데이터 삭제
            </button>
            <button className="btn-secondary" onClick={reset}>
              초기화
            </button>
          </div>
        </div>
      </header>

      {listOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setListOpen(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">저장된 분석 목록</h2>
                <p className="mt-1 text-xs text-slate-500">
                  사용 중 {quota.usedKb} KB / 최대 {quota.limitMb} MB
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
                onClick={() => setListOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {savedEntries.length === 0 ? (
                <p className="text-sm text-slate-500">저장된 분석 데이터가 없습니다. EDA 완료 후 자동 저장됩니다.</p>
              ) : (
                <ul className="space-y-3">
                  {savedEntries.map((entry) => (
                    <li
                      key={entry.storageKey}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">{entry.filename}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {entry.sizeKb.toFixed(1)} KB · {formatSavedAt(entry.savedAt)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={listLoadingKey !== null}
                            onClick={() => void handleLoadSaved(entry.storageKey)}
                          >
                            {listLoadingKey === entry.storageKey ? "불러오는 중..." : "불러오기"}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={listLoadingKey !== null}
                            onClick={() => handleDeleteSaved(entry)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
