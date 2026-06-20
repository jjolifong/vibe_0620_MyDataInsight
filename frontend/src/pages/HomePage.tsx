import UploadView from "../components/UploadView";
import DataPreview from "../components/DataPreview";
import AnalysisDashboard from "../components/AnalysisDashboard";
import InsightPanel from "../components/InsightPanel";
import SettingsPanel from "../components/SettingsPanel";
import { useAppStore } from "../store/useAppStore";

export default function HomePage() {
  const { sessionId } = useAppStore();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <UploadView />
        {sessionId && (
          <>
            <DataPreview />
            <AnalysisDashboard />
            <InsightPanel />
          </>
        )}
      </div>
      <aside className="space-y-6">
        <SettingsPanel />
        <section className="card text-sm text-slate-600">
          <h3 className="font-medium text-slate-800">사용 흐름</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>CSV 업로드 (Papaparse 미리보기)</li>
            <li>컬럼 선택 및 EDA 자동 실행</li>
            <li>시각화·상관분석 확인</li>
            <li>EXAONE 인사이트 요청</li>
            <li>Markdown/텍스트보내기</li>
          </ol>
        </section>
      </aside>
    </div>
  );
}
