import Papa from "papaparse";
import type { ColumnType } from "../types";

export interface ClientParseResult {
  rows: Record<string, unknown>[];
  columns: string[];
  qualityIssues: string[];
}

function normalizeBooleanToken(value: unknown): "true" | "false" | null {
  if (value === null || value === undefined || value === "") return null;
  const token = String(value).trim().toLowerCase().replace(/\.$/, "");
  if (["true", "t", "1", "yes"].includes(token)) return "true";
  if (["false", "f", "0", "no"].includes(token)) return "false";
  return null;
}

export function inferClientColumnType(values: unknown[]): ColumnType {
  const nonEmpty = values.filter((value) => value !== null && value !== undefined && value !== "");
  if (nonEmpty.length === 0) return "string";

  const booleanTokens = nonEmpty.map(normalizeBooleanToken);
  if (booleanTokens.every((token) => token !== null)) {
    return "boolean";
  }

  const numericCount = nonEmpty.filter((value) => !Number.isNaN(Number(value))).length;
  if (numericCount / nonEmpty.length >= 0.9) return "number";

  return "string";
}

export function parseCsvFile(file: File): Promise<ClientParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        if (result.errors.length > 0) {
          reject(new Error(result.errors[0]?.message ?? "CSV 파싱 오류"));
          return;
        }

        const rows = result.data.filter((row) => Object.values(row).some((value) => value !== ""));
        const columns = result.meta.fields ?? Object.keys(rows[0] ?? {});
        const qualityIssues: string[] = [];

        if (columns.length === 1 && columns[0]?.includes(";")) {
          qualityIssues.push("컬럼이 1개로 인식되었습니다. 세미콜론(;) 구분 파일은 서버 업로드 결과를 기준으로 분석합니다.");
        }
        if (rows.length === 0) {
          qualityIssues.push("데이터 행이 없습니다.");
        }

        const emptyColumns = columns.filter((column) =>
          rows.every((row) => row[column] === null || row[column] === undefined || row[column] === ""),
        );
        if (emptyColumns.length > 0) {
          qualityIssues.push(`빈 컬럼 감지: ${emptyColumns.join(", ")}`);
        }

        resolve({ rows, columns, qualityIssues });
      },
      error: (error) => reject(error),
    });
  });
}
