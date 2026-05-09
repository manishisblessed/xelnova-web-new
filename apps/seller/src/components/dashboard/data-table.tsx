'use client';

import { Fragment, type ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
  renderExpanded?: (row: T, collapse: () => void) => ReactNode;
  isExpandable?: (row: T) => boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  emptyMessage = 'No data',
  renderExpanded,
  isExpandable,
}: DataTableProps<T>) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const colCount = columns.length + (renderExpanded ? 1 : 0);

  if (loading) {
    return (
      <div className="min-w-0 overflow-x-auto rounded-xl border border-border/70 -mx-1 sm:mx-0">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-200/80">
              {renderExpanded && <th className="w-10 py-3 px-2" />}
              {columns.map((col) => (
                <th key={col.key} className={`text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ''}`}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((i) => (
              <tr key={i} className="border-b border-gray-100">
                {renderExpanded && <td className="py-4 px-2" />}
                {columns.map((col) => (
                  <td key={col.key} className="py-4 px-4">
                    <div className="h-4 rounded-md bg-gray-100 animate-pulse" style={{ width: `${50 + Math.random() * 40}%`, maxWidth: 140 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
          <ChevronDown size={20} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-border/70 -mx-1 sm:mx-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-gray-200/80">
            {renderExpanded && <th className="w-10 py-3 px-1" />}
            {columns.map((col) => (
              <th key={col.key} className={`text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ''}`}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const rowId = keyExtractor(row);
            const isExpanded = expandedRowId === rowId;
            const canExpand = renderExpanded && (!isExpandable || isExpandable(row));

            return (
              <Fragment key={rowId}>
                <tr
                  className={`border-b transition-colors ${canExpand ? 'cursor-pointer' : ''} ${
                    isExpanded
                      ? 'bg-primary-50/40 border-primary-100'
                      : 'border-gray-100 hover:bg-gray-50/60'
                  }`}
                  onClick={canExpand ? () => toggleRow(rowId) : undefined}
                >
                  {renderExpanded && (
                    <td className="w-10 py-3 px-1 text-center align-middle">
                      {canExpand && (
                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors ${isExpanded ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:bg-gray-100'}`}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`py-3.5 px-4 text-text-primary align-middle ${col.className || ''}`}>
                      {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as ReactNode}
                    </td>
                  ))}
                </tr>
                {isExpanded && canExpand && (
                  <tr className="border-b border-primary-100">
                    <td colSpan={colCount} className="p-0">
                      {renderExpanded(row, () => setExpandedRowId(null))}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
