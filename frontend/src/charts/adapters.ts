import type { ChartData } from "chart.js";
import type { AnalysisResult, BarData, HistogramData, ScatterData } from "../types";
import { CHART_PALETTE } from "./theme";

export function histogramToBarData(data: HistogramData): ChartData<"bar"> {
  return {
    labels: data.bins.map((b) => b.label),
    datasets: [
      {
        label: `${data.column} 빈도`,
        data: data.bins.map((b) => b.count),
        backgroundColor: CHART_PALETTE[0],
        borderRadius: 4,
      },
    ],
  };
}

export function histogramToLineData(data: HistogramData): ChartData<"line"> {
  return {
    labels: data.bins.map((b) => b.label),
    datasets: [
      {
        label: `${data.column} 분포`,
        data: data.bins.map((b) => b.count),
        borderColor: CHART_PALETTE[0],
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        tension: 0.3,
        fill: false,
      },
    ],
  };
}

export function histogramToAreaData(data: HistogramData): ChartData<"line"> {
  return {
    labels: data.bins.map((b) => b.label),
    datasets: [
      {
        label: `${data.column} 누적 분포`,
        data: data.bins.map((b) => b.count),
        borderColor: CHART_PALETTE[2],
        backgroundColor: "rgba(139, 92, 246, 0.35)",
        tension: 0.3,
        fill: true,
      },
    ],
  };
}

export function categoricalToBarData(data: BarData): ChartData<"bar"> {
  return {
    labels: data.items.map((item) => item.label),
    datasets: [
      {
        label: `${data.column} 빈도`,
        data: data.items.map((item) => item.count),
        backgroundColor: data.items.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
        borderRadius: 4,
      },
    ],
  };
}

export function categoricalToPieData(data: BarData): ChartData<"pie"> {
  return {
    labels: data.items.map((item) => item.label),
    datasets: [
      {
        label: data.column,
        data: data.items.map((item) => item.count),
        backgroundColor: data.items.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
      },
    ],
  };
}

export function scatterToScatterData(data: ScatterData): ChartData<"scatter"> {
  return {
    datasets: [
      {
        label: `${data.xColumn} vs ${data.yColumn}`,
        data: data.points.map((p) => ({ x: p.x, y: p.y })),
        backgroundColor: CHART_PALETTE[3],
        pointRadius: 4,
      },
    ],
  };
}

export function scatterToBubbleData(data: ScatterData): ChartData<"bubble"> {
  const maxDist = Math.max(
    ...data.points.map((p) => Math.sqrt(p.x * p.x + p.y * p.y)),
    1,
  );
  return {
    datasets: [
      {
        label: `${data.xColumn} vs ${data.yColumn}`,
        data: data.points.map((p) => ({
          x: p.x,
          y: p.y,
          r: Math.max(3, (Math.sqrt(p.x * p.x + p.y * p.y) / maxDist) * 12),
        })),
        backgroundColor: "rgba(124, 58, 237, 0.55)",
      },
    ],
  };
}

/** 상관계수 상위 쌍을 막대 차트로 (Scale/비교용) */
export function correlationPairsToBarData(analysis: AnalysisResult, topN = 10): ChartData<"bar"> {
  const pairs = analysis.correlation.pairs.slice(0, topN);
  return {
    labels: pairs.map((p) => `${p.columnA} / ${p.columnB}`),
    datasets: [
      {
        label: "상관계수",
        data: pairs.map((p) => p.correlation),
        backgroundColor: pairs.map((p) =>
          p.correlation >= 0 ? "rgba(37, 99, 235, 0.75)" : "rgba(239, 68, 68, 0.75)",
        ),
        borderRadius: 4,
      },
    ],
  };
}
