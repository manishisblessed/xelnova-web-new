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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th key={col.key} className="text-left py-3 px-4 font-medium text-text-muted">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="border-b border-border-light">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4">
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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col.key} className={`text-left py-3 px-4 font-medium text-text-muted ${col.className || ''}`}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="border-b border-border-light hover:bg-surface-muted/50">
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
