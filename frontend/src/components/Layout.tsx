import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { checkHealth } from "../api/client";
import { useAppStore } from "../store/useAppStore";

export default function Layout() {
  const { error, reset } = useAppStore();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    void checkHealth().then(setBackendOnline);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-brand-700">MyDataInsight</h1>
            <p className="text-sm text-slate-500">EXAONE 로컬 LLM 기반 CSV 데이터 분석</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                backendOnline ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              백엔드 {backendOnline ? "연결됨" : backendOnline === false ? "오프라인" : "확인 중"}
            </span>
            <button className="btn-secondary" onClick={reset}>
              초기화
            </button>
          </div>
        </div>
      </header>

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
