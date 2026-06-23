import type { ChartOptions } from "chart.js";

export const CHART_PALETTE = [
  "#2563eb",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

const basePlugins = {
  legend: {
    display: true,
    position: "top" as const,
  },
};

function withTitle<T extends ChartOptions>(options: T, title?: string): T {
  return {
    ...options,
    plugins: {
      ...options.plugins,
      ...basePlugins,
      title: title ? { display: true, text: title } : { display: false },
    },
  };
}

export function barChartOptions(title?: string): ChartOptions<"bar"> {
  return withTitle(
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: "rgba(148, 163, 184, 0.2)" }, ticks: { maxRotation: 45 } },
        y: { beginAtZero: true, grid: { color: "rgba(148, 163, 184, 0.2)" } },
      },
    },
    title,
  );
}

export function lineChartOptions(title?: string): ChartOptions<"line"> {
  return withTitle(
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: "rgba(148, 163, 184, 0.2)" }, ticks: { maxRotation: 45 } },
        y: { beginAtZero: true, grid: { color: "rgba(148, 163, 184, 0.2)" } },
      },
    },
    title,
  );
}

export function scatterChartOptions(title?: string): ChartOptions<"scatter"> {
  return withTitle(
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: "linear", grid: { color: "rgba(148, 163, 184, 0.2)" } },
        y: { type: "linear", grid: { color: "rgba(148, 163, 184, 0.2)" } },
      },
    },
    title,
  );
}

export function bubbleChartOptions(title?: string): ChartOptions<"bubble"> {
  return withTitle(
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: "linear", grid: { color: "rgba(148, 163, 184, 0.2)" } },
        y: { type: "linear", grid: { color: "rgba(148, 163, 184, 0.2)" } },
      },
    },
    title,
  );
}

export function pieChartOptions(title?: string): ChartOptions<"pie"> {
  return withTitle(
    {
      responsive: true,
      maintainAspectRatio: false,
    },
    title,
  );
}

/** Scale Chart: Y축 로그 스케일 (Chart.js Scales 샘플 패턴) */
export function logarithmicScaleOptions(title?: string): ChartOptions<"line"> {
  return withTitle(
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: "rgba(148, 163, 184, 0.2)" } },
        y: {
          type: "logarithmic",
          min: 1,
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
      },
    },
    title,
  );
}
