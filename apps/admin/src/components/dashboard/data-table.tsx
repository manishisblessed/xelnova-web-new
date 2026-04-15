'use client';

import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, data, keyExtractor, loading, emptyMessage = 'No data' }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b border-border bg-surface-muted/30">
              {columns.map((col) => (
                <th key={col.key} className={`text-left py-3 px-4 font-semibold text-text-muted text-xs uppercase tracking-wider ${col.className || ''}`}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className={`py-3 px-4 ${col.className || ''}`}>
                    <div className="h-4 w-3/4 max-w-[120px] rounded bg-surface-muted animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (!data.length) return <div className="py-12 text-center text-text-muted text-sm">{emptyMessage}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b border-border bg-surface-muted/30">
            {columns.map((col) => (
              <th key={col.key} className={`text-left py-3 px-4 font-semibold text-text-muted text-xs uppercase tracking-wider ${col.className || ''}`}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="hover:bg-surface-muted/40 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={`py-3 px-4 text-text-primary ${col.className || ''}`}>
                  {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
