import { useState } from "react";
import { useDebugLog, type DebugLogEntry } from "../hooks/useDebugLog";

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function statusIcon(status: DebugLogEntry["status"]) {
  switch (status) {
    case "pending":
      return "⏳";
    case "success":
      return "✓";
    case "error":
      return "✗";
  }
}

function statusClass(status: DebugLogEntry["status"]) {
  switch (status) {
    case "pending":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "success":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "error":
      return "text-rose-600 bg-rose-50 border-rose-200";
  }
}

export default function DebugLogPanel() {
  const { logs, clearLogs } = useDebugLog();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-300 bg-white shadow-lg">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span>디버그 로그 ({logs.length})</span>
        <span className="text-xs text-slate-500">{expanded ? "접기 ▼" : "펼치기 ▲"}</span>
      </button>

      {expanded && (
        <div className="max-h-64 overflow-y-auto border-t border-slate-200">
          <div className="flex justify-end border-b border-slate-100 px-4 py-2">
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-800"
              onClick={clearLogs}
            >
              전체 지우기
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">아직 fetch 요청이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs ${statusClass(log.status)}`}
                >
                  <span className="shrink-0 font-mono text-slate-600">{formatTime(log.timestamp)}</span>
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {log.method} {log.url}
                  </span>
                  <span className="shrink-0 font-semibold">{statusIcon(log.status)}</span>
                  {log.statusCode !== undefined && (
                    <span className="shrink-0 font-mono">{log.statusCode}</span>
                  )}
                  {log.durationMs !== undefined && (
                    <span className="shrink-0 font-mono text-slate-600">{log.durationMs}ms</span>
                  )}
                  {log.errorMessage && (
                    <span className="w-full truncate text-rose-700">{log.errorMessage}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
