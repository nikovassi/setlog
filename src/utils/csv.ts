export type Cell = string | number | boolean | null | undefined;

function escape(cell: Cell): string {
  if (cell == null) return '';
  const s = String(cell);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180 CSV. A UTF-8 BOM is prepended so Excel detects the encoding. */
export function toCSV(header: string[], rows: Cell[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n') + '\r\n';
}
