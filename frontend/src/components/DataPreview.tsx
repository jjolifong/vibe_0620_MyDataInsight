import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";

const TABLE_DISPLAY_ROWS = 20;

const typeBadge: Record<string, string> = {
  number: "bg-blue-100 text-blue-700",
  string: "bg-emerald-100 text-emerald-700",
  boolean: "bg-purple-100 text-purple-700",
  date: "bg-amber-100 text-amber-700",
};

export default function DataPreview() {
  const { metadata, preview, clientRows, qualityIssues, selectedColumns, toggleColumn } = useAppStore();

  const displayRows = useMemo(() => {
    const source = preview.length > 0 ? preview : clientRows;
    return source.slice(0, TABLE_DISPLAY_ROWS);
  }, [preview, clientRows]);

  if (!metadata && clientRows.length === 0) {
    return (
      <section className="card">
        <p className="text-sm text-slate-500">업로드된 데이터가 없습니다.</p>
      </section>
    );
  }

  const columns = metadata?.columns.map((col) => col.name) ?? Object.keys(displayRows[0] ?? {});

  return (
    <section className="card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">데이터 미리보기</h2>
          {metadata && (
            <p className="text-sm text-slate-600">
              {metadata.rowCount.toLocaleString()}행 · {metadata.columnCount}열 · 중복 {metadata.duplicateRows}행
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => useAppStore.getState().setSelectedColumns(columns)}
          >
            전체 선택
          </button>
          <button className="btn-secondary" onClick={() => useAppStore.getState().setSelectedColumns([])}>
            전체 해제
          </button>
        </div>
      </div>

      {qualityIssues.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">데이터 품질 체크</p>
          <ul className="mt-2 list-disc pl-5">
            {qualityIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {metadata && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {metadata.columns.map((col) => (
            <label
              key={col.name}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selectedColumns.includes(col.name)}
                onChange={() => toggleColumn(col.name)}
                className="mt-1"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{col.name}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${typeBadge[col.type] ?? "bg-slate-100"}`}>
                    {col.type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  결측 {col.nullCount} ({col.nullPct}%) · 고유값 {col.unique}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-3 py-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-slate-100">
                {columns.map((col) => (
                  <td key={col} className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
