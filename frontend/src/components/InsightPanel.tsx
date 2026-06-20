import { requestInsights } from "../api/client";
import { useAppStore } from "../store/useAppStore";

function buildExportMarkdown(): string {
  const { filename, metadata, analysis, insight } = useAppStore.getState();
  const lines = [
    "# MyDataInsight 분석 리포트",
    "",
    `파일: ${filename ?? "-"}`,
    metadata ? `크기: ${metadata.rowCount}행 x ${metadata.columnCount}열` : "",
    "",
  ];

  if (analysis) {
    lines.push("## EDA 요약", "", "### 결측치", "");
    analysis.missing.perColumn.forEach((item) => {
      lines.push(`- ${item.column}: ${item.nullCount} (${item.nullPct}%)`);
    });
    lines.push("", "### 상관관계 상위 쌍", "");
    analysis.correlation.pairs.slice(0, 10).forEach((pair) => {
      lines.push(`- ${pair.columnA} ↔ ${pair.columnB}: ${pair.correlation}`);
    });
  }

  if (insight) {
    lines.push("", "## EXAONE 인사이트", "");
    if (insight.meta) {
      lines.push(
        `> 전체 ${insight.meta.totalRows}행 기준 통계, 샘플 ${insight.meta.sampleRows}행(${insight.meta.samplingMethod})`,
        "",
      );
    }
    lines.push(insight.insight);
  }

  return lines.filter(Boolean).join("\n");
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function InsightPanel() {
  const {
    sessionId,
    analysis,
    insight,
    settings,
    setInsight,
    setInsightLoading,
    setError,
    insightLoading,
  } = useAppStore();

  const handleInsightRequest = async () => {
    if (!sessionId) return;
    setInsightLoading(true);
    setError(null);
    try {
      const result = await requestInsights(
        sessionId,
        settings.insightSampleRows,
        settings.insightMaxRows,
        settings.samplingMethod,
      );
      setInsight(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : "인사이트 요청에 실패했습니다.");
    } finally {
      setInsightLoading(false);
    }
  };

  const edaSummary = analysis
    ? [
        `선택 컬럼 ${analysis.selectedColumns.length}개`,
        `결측 컬럼 ${analysis.missing.perColumn.filter((item) => item.nullCount > 0).length}개`,
        `상관쌍 ${analysis.correlation.pairs.length}개`,
      ].join(" · ")
    : "EDA 결과가 없습니다.";

  return (
    <section className="card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">인사이트 요약</h2>
          <p className="mt-1 text-sm text-slate-600">{edaSummary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={!sessionId || insightLoading} onClick={() => void handleInsightRequest()}>
            {insightLoading ? "EXAONE 분석 중..." : "EXAONE에게 인사이트 설명 요청"}
          </button>
          {insightLoading && (
            <p className="w-full text-sm text-slate-600">
              EXAONE 분석 중... 로컬 모델이라 최대 3~4분 걸릴 수 있습니다.
            </p>
          )}
          <button
            className="btn-secondary"
            disabled={!analysis && !insight}
            onClick={() => downloadText("mydatainsight-report.md", buildExportMarkdown(), "text/markdown")}
          >
            Markdown보내기
          </button>
          <button
            className="btn-secondary"
            disabled={!analysis && !insight}
            onClick={() => downloadText("mydatainsight-report.txt", buildExportMarkdown(), "text/plain")}
          >
            텍스트보내기
          </button>
        </div>
      </div>

      {insight?.meta && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          통계는 전체 <strong>{insight.meta.totalRows.toLocaleString()}행</strong> 기준이며, EXAONE에는 샘플{" "}
          <strong>{insight.meta.sampleRows}행</strong>(
          {insight.meta.samplingMethod === "random" ? "무작위 추출" : "상위 N행"})만 전달됩니다.
        </div>
      )}

      {insight ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">모델: {insight.model} · 상태: {insight.status}</p>
            <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-slate-800">{insight.insight}</div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          EDA 실행 후 EXAONE 버튼을 누르면 로컬 Ollama(`exaone3.5:7.8b`)가 인사이트를 생성합니다.
        </p>
      )}
    </section>
  );
}
