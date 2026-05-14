'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { Button } from '@xelnova/ui';
import { DashboardHeader } from './dashboard-header';
import { DataTable, type Column } from './data-table';
import { apiGet } from '@/lib/api';
import { toast } from 'sonner';

function valueAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

interface AdminListPageProps<T> {
  title: string;
  section: string;
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  searchKeys?: (keyof T | string)[];
  filterKey?: keyof T;
  filterOptions?: string[];
  onAdd?: () => void;
  addLabel?: string;
  renderActions?: (row: T) => ReactNode;
  actionsClassName?: string;
  children?: ReactNode;
  refreshTrigger?: number;
  /** Extra query string params for `apiGet` (e.g. `isFlashDeal: 'true'`). */
  queryParams?: Record<string, string>;
  /** Transform API rows before search/filter (e.g. flatten a category tree). */
  normalizeItems?: (rows: T[]) => T[];
  /** Pass custom data instead of fetching from API. */
  customData?: T[];
}

export function AdminListPage<T extends object>({
  title,
  section,
  columns,
  keyExtractor,
  searchKeys,
  filterKey,
  filterOptions,
  onAdd,
  addLabel = 'Add New',
  renderActions,
  actionsClassName,
  children,
  refreshTrigger,
  queryParams,
  normalizeItems,
  customData,
}: AdminListPageProps<T>) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') ?? '';
  const initialFilter = searchParams?.get('status') ?? '';
  const hasPendingChangesFilter = searchParams?.get('hasPendingChanges') === 'true';
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!customData);
  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState(initialFilter);

  // Keep state in sync if user navigates between list pages with different
  // ?search params (e.g. via the global search jump links).
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);
  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const fetchData = useCallback(async () => {
    try {
      const result = await apiGet<T[]>(section, queryParams);
      setData(normalizeItems ? normalizeItems(result) : result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [section, normalizeItems, queryParams]);

  useEffect(() => {
    if (!customData) {
      fetchData();
    }
  }, [fetchData, refreshTrigger, customData]);
  
  useEffect(() => {
    if (customData) {
      setData(customData);
      setLoading(false);
    }
  }, [customData]);

  let filtered = data;
  if (search && searchKeys?.length) {
    const q = search.toLowerCase();
    filtered = filtered.filter(row =>
      searchKeys.some((k) => {
        const v = String(valueAtPath(row, k as string) ?? '').toLowerCase();
        return v.includes(q);
      }),
    );
  }
  if (filter && filterKey) {
    filtered = filtered.filter(row => String((row as Record<string, unknown>)[filterKey as string]) === filter);
  }
  // Filter by hasPendingChanges if specified in URL
  if (hasPendingChangesFilter) {
    filtered = filtered.filter(row => (row as Record<string, unknown>).hasPendingChanges === true);
  }

  const allColumns = renderActions
    ? [
        ...columns,
        {
          key: '_actions',
          header: 'Actions',
          render: renderActions,
          className: actionsClassName ?? 'w-28 min-w-[7rem] text-right whitespace-nowrap',
        },
      ]
    : columns;

  return (
    <>
      {title && <DashboardHeader title={title} />}
      <div className="p-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3"
        >
          {(searchKeys?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 flex-1 min-w-[200px] max-w-md">
              <Search size={18} className="text-text-muted shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
          )}
          {filterKey && filterOptions && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none"
            >
              <option value="">All</option>
              {filterOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
          {hasPendingChangesFilter && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-warning-100 text-warning-800 border border-warning-200">
              <span className="w-2 h-2 rounded-full bg-warning-500 animate-pulse" />
              Showing products with pending changes
            </span>
          )}
          {!customData && (
            <button
              onClick={() => { setLoading(true); void fetchData(); }}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-muted transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          )}
          <div className="flex-1" />
          {onAdd && (
            <Button variant="primary" size="sm" onClick={onAdd}>
              <Plus size={16} /> {addLabel}
            </Button>
          )}
        </motion.div>
        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <DataTable<T>
            columns={allColumns as Column<T>[]}
            data={filtered}
            keyExtractor={keyExtractor}
            loading={loading}
            emptyMessage={title ? `No ${title.toLowerCase()} found` : 'No items found'}
          />
        </div>
        {children}
      </div>
    </>
  );
}
