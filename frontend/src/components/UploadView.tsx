import { useRef } from "react";
import { analyzeData, uploadCsv } from "../api/client";
import { useAppStore } from "../store/useAppStore";
import { parseCsvFile } from "../utils/csvParser";

export default function UploadView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    setUploadResult,
    setClientParse,
    setAnalysis,
    setLoading,
    setAnalyzing,
    setError,
    loading,
    filename,
    selectedColumns,
    sessionId,
    settings,
  } = useAppStore();

  const runAnalysis = async (nextSessionId: string, columns: string[]) => {
    setAnalyzing(true);
    try {
      const analysis = await analyzeData(nextSessionId, columns, settings.correlationMethod);
      setAnalysis(analysis);
    } catch (error) {
      setError(error instanceof Error ? error.message : "EDA 분석에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const clientResult = await parseCsvFile(file);
      setClientParse({
        rows: clientResult.rows,
        qualityIssues: clientResult.qualityIssues,
      });

      const result = await uploadCsv(file);
      setUploadResult(result);
      await runAnalysis(result.sessionId, result.metadata.columns.map((col) => col.name));
    } catch (error) {
      setError(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const rerunAnalysis = async () => {
    if (!sessionId || selectedColumns.length === 0) return;
    await runAnalysis(sessionId, selectedColumns);
  };

  return (
    <section className="card">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">CSV 업로드</h2>
          <p className="mt-1 text-sm text-slate-600">
            Papaparse로 클라이언트 미리보기 후, 백엔드에서 통계·상관분석을 수행합니다.
          </p>
          {filename && (
            <p className="mt-2 text-sm font-medium text-brand-700">현재 파일: {filename}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            className="btn-primary"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? "업로드 중..." : "CSV 파일 선택"}
          </button>
          {sessionId && (
            <button className="btn-secondary" disabled={loading} onClick={() => void rerunAnalysis()}>
              EDA 재실행
            </button>
          )}
        </div>
      </div>

      <div
        className="mt-5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
      >
        <p className="text-sm text-slate-600">파일을 여기로 드래그 앤 드롭하거나 위 버튼을 클릭하세요.</p>
        <p className="mt-2 text-xs text-slate-500">쉼표(,) 및 세미콜론(;) 구분 CSV 지원</p>
      </div>
    </section>
  );
}
