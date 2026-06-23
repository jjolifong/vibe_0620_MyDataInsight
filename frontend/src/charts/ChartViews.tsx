import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Bubble, Line, Pie, Scatter } from "react-chartjs-2";
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
  return <Bar data={data} options={options ?? barChartOptions(title)} />;
}

export function LineChartView({ data, options, title }: ChartViewProps<"line">) {
  return <Line data={data} options={options ?? lineChartOptions(title)} />;
}

export function AreaChartView({ data, options, title }: ChartViewProps<"line">) {
  return <Line data={data} options={options ?? lineChartOptions(title)} />;
}

export function PieChartView({ data, options, title }: ChartViewProps<"pie">) {
  return <Pie data={data} options={options ?? pieChartOptions(title)} />;
}

export function ScatterChartView({ data, options, title }: ChartViewProps<"scatter">) {
  return <Scatter data={data} options={options ?? scatterChartOptions(title)} />;
}

export function BubbleChartView({ data, options, title }: ChartViewProps<"bubble">) {
  return <Bubble data={data} options={options ?? bubbleChartOptions(title)} />;
}

/** Scale Chart: Y축 로그 스케일 Line */
export function ScaleLineChartView({ data, title }: ChartViewProps<"line">) {
  return <Line data={data} options={logarithmicScaleOptions(title)} />;
}
