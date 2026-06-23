import { useEffect, useMemo, useState } from "react";
import { fetchPlotData } from "../api/client";
import {
  AreaChartView,
  BarChartView,
  BubbleChartView,
  categoricalToBarData,
  categoricalToPieData,
  ChartBox,
  histogramToAreaData,
  histogramToBarData,
  histogramToLineData,
  LineChartView,
  PieChartView,
  ScaleLineChartView,
  scatterToBubbleData,
  scatterToScatterData,
  ScatterChartView,
} from "../charts";
import { useAppStore } from "../store/useAppStore";
import type { BarData, HistogramData, ScatterData } from "../types";

type DashboardTab = "stats" | "charts" | "correlation";

export default function AnalysisDashboard() {
  const { analysis, metadata, selectedColumns, sessionId, settings, analyzing } = useAppStore();
  const [tab, setTab] = useState<DashboardTab>("stats");
  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
  const [barData, setBarData] = useState<BarData | null>(null);
  const [scatterData, setScatterData] = useState<ScatterData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  const numericColumns = useMemo(
    () =>
      metadata?.columns.filter((col) => col.type === "number" && selectedColumns.includes(col.name)).map((col) => col.name) ??
      [],
    [metadata, selectedColumns],
  );

  const categoricalColumns = useMemo(
    () =>
      metadata?.columns
        .filter((col) => col.type !== "number" && selectedColumns.includes(col.name))
        .map((col) => col.name) ?? [],
    [metadata, selectedColumns],
  );

  const [histColumn, setHistColumn] = useState("");
  const [barColumn, setBarColumn] = useState("");
  const [scatterX, setScatterX] = useState("");
  const [scatterY, setScatterY] = useState("");

  useEffect(() => {
    if (numericColumns.length > 0) {
      setHistColumn(numericColumns[0]);
      setScatterX(numericColumns[0]);
      setScatterY(numericColumns[1] ?? numericColumns[0]);
    }
    if (categoricalColumns.length > 0) {
      setBarColumn(categoricalColumns[0]);
    }
  }, [numericColumns, categoricalColumns]);

  useEffect(() => {
    if (!sessionId || tab !== "charts") return;

    const loadCharts = async () => {
      setChartLoading(true);
      try {
        if (histColumn) {
          const result = await fetchPlotData<HistogramData>({
            sessionId,
            chartType: "histogram",
            column: histColumn,
            bins: settings.chartBins,
          });
          setHistogramData(result.data);
        }
        if (barColumn) {
          const result = await fetchPlotData<BarData>({
            sessionId,
            chartType: "bar",
            column: barColumn,
            topN: settings.chartTopN,
          });
          setBarData(result.data);
        }
        if (scatterX && scatterY && scatterX !== scatterY) {
          const result = await fetchPlotData<ScatterData>({
            sessionId,
            chartType: "scatter",
            xColumn: scatterX,
            yColumn: scatterY,
          });
          setScatterData(result.data);
        }
      } finally {
        setChartLoading(false);
      }
    };

    void loadCharts();
  }, [sessionId, tab, histColumn, barColumn, scatterX, scatterY, settings.chartBins, settings.chartTopN]);

  if (!analysis) {
    return (
      <section className="card">
        <p className="text-sm text-slate-500">
          {analyzing ? "백엔드에서 EDA 분석을 실행 중입니다..." : "CSV를 업로드하면 자동으로 EDA가 실행됩니다."}
        </p>
      </section>
    );
  }

  const tabs: { id: DashboardTab; label: string }[] = [
    { id: "stats", label: "기본통계" },
    { id: "charts", label: "시각화" },
    { id: "correlation", label: "상관분석" },
  ];

  const histSelect = (
    <select
      className="rounded border border-slate-300 px-2 py-1 text-sm"
      value={histColumn}
      onChange={(event) => setHistColumn(event.target.value)}
    >
      {numericColumns.map((column) => (
        <option key={column} value={column}>
          {column}
        </option>
      ))}
    </select>
  );

  const barSelect = (
    <select
      className="rounded border border-slate-300 px-2 py-1 text-sm"
      value={barColumn}
      onChange={(event) => setBarColumn(event.target.value)}
    >
      {categoricalColumns.map((column) => (
        <option key={column} value={column}>
          {column}
        </option>
      ))}
    </select>
  );

  const scatterSelects = (
    <>
      <select
        className="rounded border border-slate-300 px-2 py-1 text-sm"
        value={scatterX}
        onChange={(event) => setScatterX(event.target.value)}
      >
        {numericColumns.map((column) => (
          <option key={column} value={column}>
            X: {column}
          </option>
        ))}
      </select>
      <select
        className="rounded border border-slate-300 px-2 py-1 text-sm"
        value={scatterY}
        onChange={(event) => setScatterY(event.target.value)}
      >
        {numericColumns.map((column) => (
          <option key={column} value={column}>
            Y: {column}
          </option>
        ))}
      </select>
    </>
  );

  return (
    <section className="card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">분석 대시보드</h2>
        <div className="flex gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                tab === item.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "stats" && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-medium">결측치 분석</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left">컬럼</th>
                    <th className="px-3 py-2 text-left">결측 수</th>
                    <th className="px-3 py-2 text-left">결측 비율(%)</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.missing.perColumn.map((item) => (
                    <tr key={item.column} className="border-t border-slate-100">
                      <td className="px-3 py-2">{item.column}</td>
                      <td className="px-3 py-2">{item.nullCount}</td>
                      <td className="px-3 py-2">{item.nullPct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              결측 행: {analysis.missing.rowsWithAnyMissing} · 전체 결측 행: {analysis.missing.rowsWithAllMissing}
            </p>
          </div>

          <div>
            <h3 className="mb-3 font-medium">수치형 요약 통계</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left">컬럼</th>
                    <th className="px-3 py-2 text-left">평균</th>
                    <th className="px-3 py-2 text-left">중앙값</th>
                    <th className="px-3 py-2 text-left">표준편차</th>
                    <th className="px-3 py-2 text-left">최소</th>
                    <th className="px-3 py-2 text-left">최대</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analysis.numericSummary).map(([column, stats]) => (
                    <tr key={column} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">{column}</td>
                      <td className="px-3 py-2">{stats.mean?.toFixed(3) ?? "-"}</td>
                      <td className="px-3 py-2">{stats.median?.toFixed(3) ?? "-"}</td>
                      <td className="px-3 py-2">{stats.std?.toFixed(3) ?? "-"}</td>
                      <td className="px-3 py-2">{stats.min?.toFixed(3) ?? "-"}</td>
                      <td className="px-3 py-2">{stats.max?.toFixed(3) ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-medium">범주형 빈도</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(analysis.categoricalSummary).map(([column, summary]) => (
                <div key={column} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-medium">{column}</p>
                  <p className="text-xs text-slate-500">고유값 {summary.unique}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {summary.topValues.map((item) => (
                      <li key={`${column}-${String(item.value)}`} className="flex justify-between">
                        <span>{String(item.value)}</span>
                        <span className="text-slate-500">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "charts" && (
        <div className="space-y-6">
          <p className="text-xs text-slate-500">Chart.js 기반 시각화 (Bar · Line · Area · Pie · Scatter · Bubble · Scale)</p>
          {chartLoading && <p className="text-sm text-slate-500">차트 데이터를 불러오는 중...</p>}

          {histogramData && (
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartBox title="Bar Chart — 히스토그램" controls={histSelect}>
                <BarChartView data={histogramToBarData(histogramData)} />
              </ChartBox>
              <ChartBox title="Line Chart — 분포">
                <LineChartView data={histogramToLineData(histogramData)} />
              </ChartBox>
              <ChartBox title="Area Chart — 분포">
                <AreaChartView data={histogramToAreaData(histogramData)} />
              </ChartBox>
              <ChartBox title="Scale Chart — 로그 Y축">
                <ScaleLineChartView data={histogramToLineData(histogramData)} title="Log scale" />
              </ChartBox>
            </div>
          )}

          {barData && (
            <div className="grid gap-4 md:grid-cols-2">
              <ChartBox title="Bar Chart — 범주 빈도" controls={barSelect}>
                <BarChartView data={categoricalToBarData(barData)} />
              </ChartBox>
              <ChartBox title="Pie Chart — 범주 비율">
                <PieChartView data={categoricalToPieData(barData)} />
              </ChartBox>
            </div>
          )}

          {scatterData && scatterX !== scatterY && (
            <div className="grid gap-4 md:grid-cols-2">
              <ChartBox title="Scatter Chart" controls={scatterSelects}>
                <ScatterChartView data={scatterToScatterData(scatterData)} />
              </ChartBox>
              <ChartBox title="Bubble Chart">
                <BubbleChartView data={scatterToBubbleData(scatterData)} />
              </ChartBox>
            </div>
          )}
        </div>
      )}

      {tab === "correlation" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            상관계수 방식: {settings.correlationMethod.toUpperCase()} · 전체 데이터 기준
          </p>
          {analysis.correlation.columns.length < 2 ? (
            <p className="text-sm text-slate-500">상관분석을 위한 수치형 변수가 부족합니다.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left">변수</th>
                      {analysis.correlation.columns.map((column) => (
                        <th key={column} className="px-3 py-2 text-left">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.correlation.columns.map((rowName, rowIndex) => (
                      <tr key={rowName} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">{rowName}</td>
                        {analysis.correlation.matrix[rowIndex]?.map((value, colIndex) => (
                          <td
                            key={`${rowName}-${colIndex}`}
                            className="px-3 py-2"
                            style={{
                              backgroundColor:
                                value === null
                                  ? undefined
                                  : `rgba(37, 99, 235, ${Math.min(Math.abs(value), 1) * 0.35})`,
                            }}
                          >
                            {value === null ? "-" : value.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="mb-2 font-medium">상관계수 상위 쌍</h3>
                <ul className="space-y-1 text-sm">
                  {analysis.correlation.pairs.map((pair) => (
                    <li key={`${pair.columnA}-${pair.columnB}`}>
                      {pair.columnA} ↔ {pair.columnB}: {pair.correlation.toFixed(3)}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
