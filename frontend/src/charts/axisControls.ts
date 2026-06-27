import type { ChartOptions } from "chart.js";

export interface AxisControlState {
  xMin: string;
  xMax: string;
  yMin: string;
  yMax: string;
  logScaleY: boolean;
}

export function parseAxisValue(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function applyAxisControls(
  options: ChartOptions,
  controls: AxisControlState,
  hasScales: boolean,
): ChartOptions {
  if (!hasScales) {
    return { ...options, responsive: true, maintainAspectRatio: false };
  }

  const xMin = parseAxisValue(controls.xMin);
  const xMax = parseAxisValue(controls.xMax);
  const yMin = parseAxisValue(controls.yMin);
  const yMax = parseAxisValue(controls.yMax);

  const scales = { ...(options.scales ?? {}) } as Record<string, Record<string, unknown>>;

  if (scales.x) {
    scales.x = {
      ...scales.x,
      ...(xMin !== undefined ? { min: xMin } : {}),
      ...(xMax !== undefined ? { max: xMax } : {}),
    };
  }

  if (scales.y) {
    const nextY: Record<string, unknown> = {
      ...scales.y,
      type: controls.logScaleY ? "logarithmic" : scales.y.type === "logarithmic" ? "linear" : (scales.y.type ?? "linear"),
    };
    if (yMin !== undefined) nextY.min = yMin;
    else if (controls.logScaleY && nextY.min === undefined) nextY.min = 1;
    if (yMax !== undefined) nextY.max = yMax;
    scales.y = nextY;
  }

  return {
    ...options,
    responsive: true,
    maintainAspectRatio: false,
    scales,
  };
}

export function withChartClick(options: ChartOptions, onOpen: () => void): ChartOptions {
  return {
    ...options,
    onClick: () => {
      onOpen();
    },
  };
}

export function initialAxisControls(defaultLogY = false): AxisControlState {
  return {
    xMin: "",
    xMax: "",
    yMin: "",
    yMax: "",
    logScaleY: defaultLogY,
  };
}
