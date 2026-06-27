import { useEffect, useRef, useState } from "react";
import { analyzeData } from "../api/client";
import { useAppStore } from "../store/useAppStore";

const SELECTED_RUNTIME_KEY = "mydatainsight.llmRuntime";

type LlmRuntime = "lmstudio" | "ollama";

interface LmModelItem {
  id: string;
}

interface LmModelsResponse {
  data?: LmModelItem[];
}

export default function SettingsPanel() {
  const {
    settings,
    updateSettings,
    sessionId,
    selectedColumns,
    setAnalysis,
    setAnalyzing,
    setError,
    selectedModel,
    setSelectedModel,
  } = useAppStore();

  const [models, setModels] = useState<LmModelItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedRuntime, setSelectedRuntime] = useState<LlmRuntime>(() => {
    const saved = localStorage.getItem(SELECTED_RUNTIME_KEY);
    return saved === "ollama" ? "ollama" : "lmstudio";
  });
  const selectedRuntimeRef = useRef(selectedRuntime);

  useEffect(() => {
    selectedRuntimeRef.current = selectedRuntime;
    localStorage.setItem(SELECTED_RUNTIME_KEY, selectedRuntime);
  }, [selectedRuntime]);

  useEffect(() => {
    const downstreamFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");

      if (url.includes("/api/insights") && method.toUpperCase() === "POST" && init?.body) {
        const runtime = selectedRuntimeRef.current;
        if (typeof init.body === "string") {
          try {
            const body = JSON.parse(init.body) as Record<string, unknown>;
            body.runtime = runtime;
            init = { ...init, body: JSON.stringify(body) };
          } catch {
            // JSON 파싱 실패 시 원래 요청 그대로 전달
          }
        }
      }

      return downstreamFetch(input, init);
    };

    return () => {
      window.fetch = downstreamFetch;
    };
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true);
      setModelsError(null);
      setModels([]);
      try {
        const response = await fetch(`/api/models?runtime=${selectedRuntime}`);
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || `모델 목록 요청 실패: ${response.status}`);
        }
        const payload = (await response.json()) as LmModelsResponse;
        const items = payload.data ?? [];
        setModels(items);
        if (items.length > 0) {
          const current = useAppStore.getState().selectedModel;
          const exists = current && items.some((item) => item.id === current);
          setSelectedModel(exists ? current : items[0].id);
        } else {
          setSelectedModel("");
        }
      } catch (error) {
        setModelsError(error instanceof Error ? error.message : "모델 목록을 불러오지 못했습니다.");
        setSelectedModel("");
      } finally {
        setModelsLoading(false);
      }
    };

    void loadModels();
  }, [selectedRuntime, setSelectedModel]);

  const rerunAnalysis = async () => {
    if (!sessionId || selectedColumns.length === 0) return;
    setAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeData(sessionId, selectedColumns, settings.correlationMethod);
      setAnalysis(analysis);
    } catch (error) {
      setError(error instanceof Error ? error.message : "분석 재실행에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <section className="card space-y-4">
      <h2 className="text-lg font-semibold">설정</h2>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">LLM 런타임</span>
        <select
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={selectedRuntime}
          onChange={(event) => setSelectedRuntime(event.target.value as LlmRuntime)}
        >
          <option value="lmstudio">LM Studio</option>
          <option value="ollama">Ollama</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">
          {selectedRuntime === "ollama" ? "Ollama 모델" : "LM Studio 모델"}
        </span>
        <select
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={selectedModel}
          disabled={modelsLoading || models.length === 0}
          onChange={(event) => setSelectedModel(event.target.value)}
        >
          {models.length === 0 ? (
            <option value="">
              {modelsLoading ? "모델 목록 불러오는 중..." : "사용 가능한 모델 없음"}
            </option>
          ) : (
            models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))
          )}
        </select>
        {modelsError && <p className="mt-1 text-xs text-rose-600">{modelsError}</p>}
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">미리보기 행 수</span>
        <input
          type="number"
          min={5}
          max={50}
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={settings.previewRows}
          onChange={(event) => updateSettings({ previewRows: Number(event.target.value) })}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">히스토그램 구간 수</span>
        <input
          type="number"
          min={5}
          max={50}
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={settings.chartBins}
          onChange={(event) => updateSettings({ chartBins: Number(event.target.value) })}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">바 차트 상위 N</span>
        <input
          type="number"
          min={5}
          max={30}
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={settings.chartTopN}
          onChange={(event) => updateSettings({ chartTopN: Number(event.target.value) })}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">상관계수 방식</span>
        <select
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={settings.correlationMethod}
          onChange={(event) =>
            updateSettings({ correlationMethod: event.target.value as "pearson" | "spearman" })
          }
        >
          <option value="pearson">Pearson</option>
          <option value="spearman">Spearman</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">EXAONE 샘플링 방식</span>
        <select
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={settings.samplingMethod}
          onChange={(event) =>
            updateSettings({ samplingMethod: event.target.value as "random" | "head" })
          }
        >
          <option value="random">무작위 추출 (권장)</option>
          <option value="head">상위 N행</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">EXAONE 최대 샘플 행</span>
        <input
          type="number"
          min={20}
          max={200}
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={settings.insightMaxRows}
          onChange={(event) => updateSettings({ insightMaxRows: Number(event.target.value) })}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">프롬프트 샘플 표시 행</span>
        <input
          type="number"
          min={3}
          max={20}
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={settings.insightSampleRows}
          onChange={(event) => updateSettings({ insightSampleRows: Number(event.target.value) })}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">언어</span>
        <select
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={settings.language}
          onChange={(event) => updateSettings({ language: event.target.value as "ko" | "en" })}
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </label>

      <button className="btn-primary w-full" disabled={!sessionId} onClick={() => void rerunAnalysis()}>
        선택 컬럼 기준 분석 재실행
      </button>
    </section>
  );
}
