import {
  ArcElement,
  BarElement,
  BubbleController,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  LogarithmicScale,
  PointElement,
  RadialLinearScale,
  ScatterController,
  Title,
  Tooltip,
} from "chart.js";

let registered = false;

/** Chart.js 컴포넌트 1회 등록 (Bar, Line, Area, Pie, Scatter, Bubble, Radar/Scale) */
export function ensureChartJsRegistered() {
  if (registered) return;
  registered = true;

  ChartJS.register(
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    RadialLinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    ScatterController,
    BubbleController,
    Title,
    Tooltip,
    Legend,
    Filler,
  );
}

ensureChartJsRegistered();
