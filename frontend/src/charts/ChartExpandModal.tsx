import { useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Chart as ChartJS, ChartOptions, ChartType } from "chart.js";
import {
  applyAxisControls,
  initialAxisControls,
  type AxisControlState,
  withChartClick,
} from "./axisControls";

interface ChartExpandModalProps<T extends ChartType> {
  title: string;
  baseOptions: ChartOptions<T>;
  hasScales: boolean;
  defaultLogY?: boolean;
  onClose: () => void;
  renderChart: (options: ChartOptions<T>, chartRef: RefObject<ChartJS<T> | null>) => ReactNode;
}

function downloadChartPng(chart: ChartJS | null | undefined, filename: string) {
  if (!chart) return;
  const url = chart.toBase64Image("image/png", 1);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  anchor.click();
}

export default function ChartExpandModal<T extends ChartType>({
  title,
  baseOptions,
  hasScales,
  defaultLogY = false,
  onClose,
  renderChart,
}: ChartExpandModalProps<T>) {
  const chartRef = useRef<ChartJS<T> | null>(null);
  const [controls, setControls] = useState<AxisControlState>(() => initialAxisControls(defaultLogY));

  const modalOptions = useMemo(
    () =>
      applyAxisControls(
        {
          ...baseOptions,
          plugins: {
            ...(baseOptions?.plugins ?? {}),
            title: { display: true, text: title },
          },
        } as ChartOptions,
        controls,
        hasScales,
      ) as ChartOptions<T>,
    [baseOptions, controls, hasScales, title],
  );

  const updateControl = (key: keyof AxisControlState, value: string | boolean) => {
    setControls((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex flex-col overflow-auto rounded-xl bg-white shadow-xl resize"
        style={{
          width: "max(800px, min(90vw, 1200px))",
          height: "85vh",
          minWidth: 600,
          minHeight: 500,
          maxWidth: "95vw",
          maxHeight: "95vh",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            type="button"
            className="rounded-lg px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        {hasScales && (
          <div className="grid gap-3 border-b border-slate-100 px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs">
              <span className="mb-1 block text-slate-600">X축 최솟값</span>
              <input
                type="number"
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                value={controls.xMin}
                onChange={(event) => updateControl("xMin", event.target.value)}
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-slate-600">X축 최댓값</span>
              <input
                type="number"
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                value={controls.xMax}
                onChange={(event) => updateControl("xMax", event.target.value)}
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-slate-600">Y축 최솟값</span>
              <input
                type="number"
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                value={controls.yMin}
                onChange={(event) => updateControl("yMin", event.target.value)}
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-slate-600">Y축 최댓값</span>
              <input
                type="number"
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                value={controls.yMax}
                onChange={(event) => updateControl("yMax", event.target.value)}
              />
            </label>
            <label className="flex items-end gap-2 pb-1 text-xs">
              <input
                type="checkbox"
                checked={controls.logScaleY}
                onChange={(event) => updateControl("logScaleY", event.target.checked)}
              />
              <span className="text-slate-700">Y축 로그 스케일</span>
            </label>
          </div>
        )}

        <div className="min-h-0 flex-1 p-4">{renderChart(modalOptions, chartRef)}</div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => downloadChartPng(chartRef.current as ChartJS | null, title.replace(/\s+/g, "-"))}
          >
            PNG 다운로드
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

interface InteractiveChartProps<T extends ChartType> {
  modalTitle?: string;
  baseOptions: ChartOptions<T>;
  hasScales?: boolean;
  defaultLogY?: boolean;
  renderChart: (options: ChartOptions<T>, chartRef: RefObject<ChartJS<T> | null>) => ReactNode;
}

export function InteractiveChart<T extends ChartType>({
  modalTitle,
  baseOptions,
  hasScales = true,
  defaultLogY = false,
  renderChart,
}: InteractiveChartProps<T>) {
  const [open, setOpen] = useState(false);
  const previewRef = useRef<ChartJS<T> | null>(null);
  const title = modalTitle ?? "차트";

  const previewOptions = useMemo(
    () => withChartClick(baseOptions as ChartOptions, () => setOpen(true)) as ChartOptions<T>,
    [baseOptions],
  );

  return (
    <>
      <div className="h-full w-full cursor-pointer" title="클릭하여 확대">
        {renderChart(previewOptions, previewRef)}
      </div>
      {open && (
        <ChartExpandModal
          title={title}
          baseOptions={baseOptions}
          hasScales={hasScales}
          defaultLogY={defaultLogY}
          onClose={() => setOpen(false)}
          renderChart={renderChart}
        />
      )}
    </>
  );
}
