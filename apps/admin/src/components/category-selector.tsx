'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, X } from 'lucide-react';

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
  /** Allow selecting categories with children (for admin parent selection) */
  allowParentSelection?: boolean;
}

export function CategorySelector({
  categories,
  value,
  onChange,
  required = false,
  placeholder = 'Select category',
  allowParentSelection = false,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<CategoryNode[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);

  // Find the selected category and build the path
  useEffect(() => {
    if (!value) {
      setSelectedPath([]);
      setCurrentLevel(0);
      return;
    }

    const findCategoryPath = (
      nodes: CategoryNode[],
      targetId: string,
      path: CategoryNode[] = []
    ): CategoryNode[] | null => {
      for (const node of nodes) {
        const newPath = [...path, node];
        if (node.id === targetId) {
          return newPath;
        }
        if (node.children?.length) {
          const found = findCategoryPath(node.children, targetId, newPath);
          if (found) return found;
        }
      }
      return null;
    };

    const path = findCategoryPath(categories, value);
    if (path) {
      setSelectedPath(path);
      setCurrentLevel(0);
    }
  }, [value, categories]);

  // Get display text for selected category
  const displayText = useMemo(() => {
    if (!selectedPath.length) return placeholder;
    return selectedPath.map((cat) => cat.name).join(' › ');
  }, [selectedPath, placeholder]);

  // Flatten all categories for search
  const flattenedCategories = useMemo(() => {
    const flatten = (nodes: CategoryNode[], parentPath: string[] = []): Array<{
      id: string;
      name: string;
      fullPath: string[];
      node: CategoryNode;
    }> => {
      const result: Array<{
        id: string;
        name: string;
        fullPath: string[];
        node: CategoryNode;
      }> = [];
      
      for (const node of nodes) {
        const fullPath = [...parentPath, node.name];
        result.push({
          id: node.id,
          name: node.name,
          fullPath,
          node,
        });
        
        if (node.children?.length) {
          result.push(...flatten(node.children, fullPath));
        }
      }
      
      return result;
    };
    
    return flatten(categories);
  }, [categories]);

  // Filter categories based on search
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    return flattenedCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.fullPath.join(' ').toLowerCase().includes(query)
    );
  }, [searchQuery, flattenedCategories]);

  // Get current categories to display
  const currentCategories = useMemo(() => {
    if (currentLevel === 0) {
      return categories;
    }
    
    let current = selectedPath[currentLevel - 1];
    return current?.children || [];
  }, [currentLevel, selectedPath, categories]);

  const handleSelectCategory = (cat: CategoryNode) => {
    const newPath = [...selectedPath.slice(0, currentLevel), cat];
    setSelectedPath(newPath);

    if (cat.children?.length && !allowParentSelection) {
      // Has children, go to next level (only if not allowing parent selection)
      setCurrentLevel(currentLevel + 1);
    } else {
      // Leaf node or parent selection allowed, select it
      onChange(cat.id);
      setIsOpen(false);
      setSearchQuery('');
      setCurrentLevel(0);
    }
  };

  const handleSelectFromSearch = (cat: { id: string; fullPath: string[]; node: CategoryNode }) => {
    onChange(cat.id);
    setIsOpen(false);
    setSearchQuery('');
    setCurrentLevel(0);
  };

  const handleGoBack = () => {
    if (currentLevel > 0) {
      setCurrentLevel(currentLevel - 1);
      setSelectedPath(selectedPath.slice(0, currentLevel));
    }
  };

  const handleClear = () => {
    onChange('');
    setSelectedPath([]);
    setCurrentLevel(0);
    setSearchQuery('');
  };

  const handleDrillDown = (e: React.MouseEvent, cat: CategoryNode) => {
    e.stopPropagation();
    const newPath = [...selectedPath.slice(0, currentLevel), cat];
    setSelectedPath(newPath);
    setCurrentLevel(currentLevel + 1);
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); } }}
        className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-left flex items-center justify-between outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 cursor-pointer"
      >
        <span className={value ? 'text-text-primary' : 'text-text-muted'}>
          {displayText}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 hover:bg-surface text-text-muted hover:text-text-primary rounded"
            >
              <X size={14} />
            </button>
          )}
          <ChevronRight
            size={16}
            className={`text-text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
              setCurrentLevel(0);
            }}
          />

          {/* Dropdown Panel */}
          <div className="absolute z-50 mt-2 w-full bg-surface-raised border border-border rounded-xl shadow-xl overflow-hidden">
            {/* Search Bar */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2">
                <Search size={16} className="text-text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-text-muted hover:text-text-primary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Breadcrumb Navigation */}
            {!searchQuery && currentLevel > 0 && (
              <div className="px-3 py-2 border-b border-border bg-surface/50">
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="text-primary-500 hover:text-primary-600 font-medium"
                  >
                    ← Back
                  </button>
                  <span className="text-text-muted">to</span>
                  <span className="text-text-secondary font-medium">
                    {selectedPath[currentLevel - 1]?.name || 'Categories'}
                  </span>
                </div>
              </div>
            )}

            {/* Category List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredBySearch ? (
                // Search Results
                filteredBySearch.length > 0 ? (
                  <div className="py-1">
                    {filteredBySearch.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectFromSearch(cat)}
                        className="w-full px-3 py-2.5 text-left hover:bg-surface/80 transition-colors"
                      >
                        <div className="text-sm text-text-primary font-medium">
                          {cat.name}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {cat.fullPath.join(' › ')}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-8 text-center text-sm text-text-muted">
                    No categories found for &quot;{searchQuery}&quot;
                  </div>
                )
              ) : (
                // Hierarchical Navigation
                <div className="py-1">
                  {currentCategories.map((cat) => (
                    <div
                      key={cat.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectCategory(cat)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectCategory(cat); }}
                      className="w-full px-3 py-2.5 text-left hover:bg-surface/80 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <span className="text-sm text-text-primary font-medium">
                        {cat.name}
                      </span>
                      {cat.children?.length && allowParentSelection ? (
                        <button
                          type="button"
                          onClick={(e) => handleDrillDown(e, cat)}
                          className="p-1 rounded hover:bg-surface-muted"
                        >
                          <ChevronRight
                            size={16}
                            className="text-text-muted group-hover:text-text-secondary"
                          />
                        </button>
                      ) : cat.children?.length ? (
                        <ChevronRight
                          size={16}
                          className="text-text-muted group-hover:text-text-secondary"
                        />
                      ) : null}
                    </div>
                  ))}
                  {currentCategories.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-text-muted">
                      No categories available
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {required && !value && (
        <p className="mt-1 text-xs text-danger-500">Category is required</p>
      )}
    </div>
  );
}
