import { analyzeData } from "../api/client";
import { useAppStore } from "../store/useAppStore";

export default function SettingsPanel() {
  const {
    settings,
    updateSettings,
    sessionId,
    selectedColumns,
    setAnalysis,
    setAnalyzing,
    setError,
  } = useAppStore();

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
