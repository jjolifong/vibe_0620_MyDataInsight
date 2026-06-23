import type { ReactNode } from "react";

interface ChartBoxProps {
  title: string;
  children: ReactNode;
  controls?: ReactNode;
  heightClass?: string;
}

export default function ChartBox({ title, children, controls, heightClass = "h-72" }: ChartBoxProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="font-medium text-slate-800">{title}</h3>
        {controls}
      </div>
      <div className={heightClass}>{children}</div>
    </div>
  );
}
