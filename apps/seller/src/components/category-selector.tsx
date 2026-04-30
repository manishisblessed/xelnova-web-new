'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, ChevronRight, X, Check, Folder } from 'lucide-react';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children?: CategoryNode[];
}

interface CategorySelectorProps {
  categories: CategoryNode[];
  value: string;
  onChange: (categoryId: string) => void;
  required?: boolean;
  placeholder?: string;
}

interface FlatCategory {
  id: string;
  name: string;
  fullPath: string[];
  depth: number;
  node: CategoryNode;
  hasChildren: boolean;
}

export function CategorySelector({
  categories,
  value,
  onChange,
  required = false,
  placeholder = 'Select category',
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredPath, setHoveredPath] = useState<CategoryNode[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const findCategoryPath = useCallback(
    (nodes: CategoryNode[], targetId: string, path: CategoryNode[] = []): CategoryNode[] | null => {
      for (const node of nodes) {
        const newPath = [...path, node];
        if (node.id === targetId) return newPath;
        if (node.children?.length) {
          const found = findCategoryPath(node.children, targetId, newPath);
          if (found) return found;
        }
      }
      return null;
    },
    [],
  );

  const selectedPath = useMemo(() => {
    if (!value) return [];
    return findCategoryPath(categories, value) ?? [];
  }, [value, categories, findCategoryPath]);

  const displayText = useMemo(() => {
    if (!selectedPath.length) return placeholder;
    return selectedPath.map((cat) => cat.name).join(' › ');
  }, [selectedPath, placeholder]);

  const flattenedCategories = useMemo(() => {
    const result: FlatCategory[] = [];
    const flatten = (nodes: CategoryNode[], parentPath: string[] = [], depth: number = 0) => {
      for (const node of nodes) {
        const fullPath = [...parentPath, node.name];
        result.push({
          id: node.id,
          name: node.name,
          fullPath,
          depth,
          node,
          hasChildren: !!(node.children?.length),
        });
        if (node.children?.length) {
          flatten(node.children, fullPath, depth + 1);
        }
      }
    };
    flatten(categories);
    return result;
  }, [categories]);

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return flattenedCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.fullPath.join(' ').toLowerCase().includes(query),
    );
  }, [searchQuery, flattenedCategories]);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedPath.length > 0) {
      setHoveredPath(selectedPath.slice(0, -1));
    } else if (isOpen) {
      setHoveredPath([]);
    }
  }, [isOpen, selectedPath]);

  const getColumnsData = useCallback(() => {
    const columns: { parentNode: CategoryNode | null; items: CategoryNode[]; level: number }[] = [];

    columns.push({ parentNode: null, items: categories, level: 0 });

    for (let i = 0; i < hoveredPath.length; i++) {
      const node = hoveredPath[i];
      if (node.children?.length) {
        columns.push({ parentNode: node, items: node.children, level: i + 1 });
      }
    }

    return columns;
  }, [categories, hoveredPath]);

  const columns = getColumnsData();

  const handleHover = (cat: CategoryNode, level: number) => {
    const newPath = [...hoveredPath.slice(0, level), cat];
    setHoveredPath(newPath);
  };

  const handleSelect = (cat: CategoryNode, level: number) => {
    if (cat.children?.length) {
      const newPath = [...hoveredPath.slice(0, level), cat];
      setHoveredPath(newPath);
    } else {
      onChange(cat.id);
      setIsOpen(false);
      setSearchQuery('');
      setHoveredPath([]);
    }
  };

  const handleSelectFromSearch = (cat: FlatCategory) => {
    onChange(cat.id);
    setIsOpen(false);
    setSearchQuery('');
    setHoveredPath([]);
  };

  const handleClear = () => {
    onChange('');
    setHoveredPath([]);
    setSearchQuery('');
  };

  const isInSelectedPath = (catId: string) => selectedPath.some((c) => c.id === catId);
  const isInHoveredPath = (catId: string) => hoveredPath.some((c) => c.id === catId);
  const isSelected = (catId: string) => catId === value;

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-100 text-yellow-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const levelLabels = ['Category', 'Subcategory', 'Type'];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-xl border bg-surface-raised px-3 py-2.5 text-sm text-left flex items-center justify-between outline-none transition-all ${
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'border-border hover:border-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30'
        }`}
      >
        {value && selectedPath.length > 0 ? (
          <span className="flex items-center gap-1 text-text-primary min-w-0 overflow-hidden">
            {selectedPath.map((cat, i) => (
              <span key={cat.id} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
                <span className={`truncate ${i === selectedPath.length - 1 ? 'font-medium text-primary-700' : 'text-gray-500'}`}>
                  {cat.name}
                </span>
              </span>
            ))}
          </span>
        ) : (
          <span className="text-text-muted">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleClear(); } }}
              className="p-0.5 hover:bg-gray-100 text-text-muted hover:text-text-primary rounded cursor-pointer transition-colors"
            >
              <X size={14} />
            </span>
          )}
          <ChevronRight size={16} className={`text-text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearchQuery(''); }} />

          <div className="absolute z-50 mt-1.5 w-full min-w-[560px] bg-white border border-gray-200 rounded-xl shadow-2xl shadow-black/10 overflow-hidden">
            {/* Search */}
            <div className="p-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/10 focus-within:bg-white transition-all">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search all categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {filteredBySearch ? (
              /* Search results */
              <div className="max-h-[320px] overflow-y-auto">
                {filteredBySearch.length > 0 ? (
                  <div className="py-1">
                    {filteredBySearch.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectFromSearch(cat)}
                        className={`w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors ${
                          isSelected(cat.id) ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {highlightMatch(cat.name, searchQuery)}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 flex-wrap">
                            {cat.fullPath.map((segment, i) => (
                              <span key={i} className="flex items-center gap-1">
                                {i > 0 && <ChevronRight size={10} className="text-gray-300" />}
                                <span className={i === cat.fullPath.length - 1 ? 'text-gray-600 font-medium' : ''}>
                                  {highlightMatch(segment, searchQuery)}
                                </span>
                              </span>
                            ))}
                          </p>
                        </div>
                        {cat.hasChildren && (
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">has sub</span>
                        )}
                        {isSelected(cat.id) && <Check size={16} className="text-primary-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center">
                    <Search size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No categories match &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                )}
              </div>
            ) : (
              /* Multi-column browser: Parent > Child > Grandchild */
              <div className="flex divide-x divide-gray-100 max-h-[320px]">
                {columns.map((col, colIdx) => (
                  <div
                    key={`col-${colIdx}-${col.parentNode?.id ?? 'root'}`}
                    className="min-w-[180px] flex-1 flex flex-col overflow-hidden"
                  >
                    {/* Column header */}
                    <div className="px-3 py-1.5 bg-gray-50/80 border-b border-gray-100 shrink-0">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        {levelLabels[colIdx] ?? `Level ${colIdx + 1}`}
                      </span>
                    </div>
                    {/* Column items */}
                    <div className="overflow-y-auto flex-1">
                      {col.items.map((cat) => {
                        const hovered = isInHoveredPath(cat.id);
                        const selected = isSelected(cat.id);
                        const inPath = isInSelectedPath(cat.id);

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleSelect(cat, colIdx)}
                            onMouseEnter={() => handleHover(cat, colIdx)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between gap-1 text-[13px] transition-colors ${
                              selected
                                ? 'bg-primary-50 text-primary-700 font-semibold'
                                : hovered
                                  ? 'bg-gray-100 text-gray-900 font-medium'
                                  : inPath
                                    ? 'bg-primary-50/50 text-primary-600'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="truncate">{cat.name}</span>
                            {selected ? (
                              <Check size={14} className="text-primary-600 shrink-0" />
                            ) : cat.children?.length ? (
                              <ChevronRight size={14} className={`shrink-0 ${hovered ? 'text-gray-500' : 'text-gray-300'}`} />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* If no columns or empty root */}
                {columns.length === 0 && (
                  <div className="flex-1 flex items-center justify-center py-10">
                    <div className="text-center">
                      <Folder size={24} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400">No categories available</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Breadcrumb footer showing current hover path */}
            {!filteredBySearch && hoveredPath.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-1 text-[11px] text-gray-500 overflow-hidden">
                  <span className="text-gray-400 shrink-0">Path:</span>
                  {hoveredPath.map((cat, i) => (
                    <span key={cat.id} className="flex items-center gap-1 min-w-0">
                      {i > 0 && <ChevronRight size={10} className="text-gray-300 shrink-0" />}
                      <span className="truncate font-medium text-gray-600">{cat.name}</span>
                    </span>
                  ))}
                  {hoveredPath[hoveredPath.length - 1]?.children?.length ? (
                    <span className="text-gray-400 shrink-0 ml-1">→ select sub-category</span>
                  ) : (
                    <span className="text-primary-500 shrink-0 ml-1">← click to select</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {required && !value && (
        <p className="mt-1 text-xs text-danger-500">Category is required</p>
      )}
    </div>
  );
}
