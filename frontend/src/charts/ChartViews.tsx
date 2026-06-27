import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Bubble, Line, Pie, Scatter } from "react-chartjs-2";
import { InteractiveChart } from "./ChartExpandModal";
import "./setup";
import {
  barChartOptions,
  bubbleChartOptions,
  lineChartOptions,
  logarithmicScaleOptions,
  pieChartOptions,
  scatterChartOptions,
} from "./theme";

interface ChartViewProps<T extends "bar" | "line" | "pie" | "scatter" | "bubble"> {
  data: ChartData<T>;
  options?: ChartOptions<T>;
  title?: string;
}

export function BarChartView({ data, options, title }: ChartViewProps<"bar">) {
  const baseOptions = options ?? barChartOptions(title);
  return (
    <InteractiveChart
      modalTitle={title ?? "Bar Chart"}
      baseOptions={baseOptions}
      renderChart={(chartOptions, chartRef) => <Bar ref={chartRef} data={data} options={chartOptions} />}
    />
  );
}

export function LineChartView({ data, options, title }: ChartViewProps<"line">) {
  const baseOptions = options ?? lineChartOptions(title);
  return (
    <InteractiveChart
      modalTitle={title ?? "Line Chart"}
      baseOptions={baseOptions}
      renderChart={(chartOptions, chartRef) => <Line ref={chartRef} data={data} options={chartOptions} />}
    />
  );
}

export function AreaChartView({ data, options, title }: ChartViewProps<"line">) {
  const baseOptions = options ?? lineChartOptions(title);
  return (
    <InteractiveChart
      modalTitle={title ?? "Area Chart"}
      baseOptions={baseOptions}
      renderChart={(chartOptions, chartRef) => <Line ref={chartRef} data={data} options={chartOptions} />}
    />
  );
}

export function PieChartView({ data, options, title }: ChartViewProps<"pie">) {
  const baseOptions = options ?? pieChartOptions(title);
  return (
    <InteractiveChart
      modalTitle={title ?? "Pie Chart"}
      baseOptions={baseOptions}
      hasScales={false}
      renderChart={(chartOptions, chartRef) => <Pie ref={chartRef} data={data} options={chartOptions} />}
    />
  );
}

export function ScatterChartView({ data, options, title }: ChartViewProps<"scatter">) {
  const baseOptions = options ?? scatterChartOptions(title);
  return (
    <InteractiveChart
      modalTitle={title ?? "Scatter Chart"}
      baseOptions={baseOptions}
      renderChart={(chartOptions, chartRef) => <Scatter ref={chartRef} data={data} options={chartOptions} />}
    />
  );
}

export function BubbleChartView({ data, options, title }: ChartViewProps<"bubble">) {
  const baseOptions = options ?? bubbleChartOptions(title);
  return (
    <InteractiveChart
      modalTitle={title ?? "Bubble Chart"}
      baseOptions={baseOptions}
      renderChart={(chartOptions, chartRef) => <Bubble ref={chartRef} data={data} options={chartOptions} />}
    />
  );
}

/** Scale Chart: Y축 로그 스케일 Line */
export function ScaleLineChartView({ data, title }: ChartViewProps<"line">) {
  const baseOptions = logarithmicScaleOptions(title);
  return (
    <InteractiveChart
      modalTitle={title ?? "Scale Chart"}
      baseOptions={baseOptions}
      defaultLogY
      renderChart={(chartOptions, chartRef) => <Line ref={chartRef} data={data} options={chartOptions} />}
    />
  );
}
