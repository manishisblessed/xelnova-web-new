"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, TrendingUp, ChevronDown, Tag } from "lucide-react";
import { cn } from "@xelnova/utils";
import { searchApi } from "@xelnova/api";
import { useCategories } from "@/lib/api";

const FALLBACK_SEARCHES: string[] = [];
const STORAGE_KEY = "xelnova-recent-searches";

type Suggestion = { type: "product" | "category"; text: string; slug: string; image?: string; price?: number };

export default function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [popularSearches, setPopularSearches] = useState<string[]>(FALLBACK_SEARCHES);
  const { data: categories } = useCategories();
  const categoriesList = categories || [];

  useEffect(() => { try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) setRecentSearches(JSON.parse(stored)); } catch {} }, []);
  useEffect(() => {
    searchApi.getPopularSearches()
      .then((searches) => { if (searches?.length) setPopularSearches(searches); })
      .catch(() => {});
  }, []);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setCategoryOpen(false); } };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const prev = debounceRef.current;
    if (prev != null) clearTimeout(prev);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await searchApi.getAutocomplete(query);
        const items: Suggestion[] = [
          ...(res?.products || []).map((p) => ({ type: "product" as const, text: p.text, slug: p.slug, image: p.image, price: p.price })),
          ...(res?.categories || []).map((c) => ({ type: "category" as const, text: c.text, slug: c.slug })),
        ];
        setSuggestions(items);
      } catch { setSuggestions([]); }
      setLoadingSuggestions(false);
    }, 250);
    return () => {
      const t = debounceRef.current;
      if (t != null) clearTimeout(t);
    };
  }, [query]);

  const saveSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => { const updated = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 8); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {} return updated; });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    const hasCategory = selectedCategory !== "all";
    if (!trimmed && !hasCategory) return;
    setOpen(false);
    if (hasCategory && !trimmed) {
      router.push(`/products?category=${encodeURIComponent(selectedCategory)}`);
      return;
    }
    saveSearch(trimmed);
    const params = new URLSearchParams({ q: trimmed });
    if (hasCategory) params.set("category", selectedCategory);
    router.push(`/search?${params.toString()}`);
  };

  const handleSuggestionClick = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setQuery(text);
    saveSearch(trimmed);
    setOpen(false);
    const params = new URLSearchParams({ q: trimmed });
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    router.push(`/search?${params.toString()}`);
  };
  const clearRecent = () => { setRecentSearches([]); try { localStorage.removeItem(STORAGE_KEY); } catch {} };

  const currentCategoryLabel = selectedCategory === "all" ? "All" : categoriesList.find((c) => c.slug === selectedCategory)?.name ?? "All";

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-3xl", className)}>
      <form onSubmit={handleSubmit} className="flex">
        <div className="relative">
          <button type="button" onClick={() => setCategoryOpen(!categoryOpen)} className="flex h-full items-center gap-1 rounded-l-xl border border-r-0 border-surface-300 bg-surface-700 px-3 py-2.5 text-sm text-surface-50 hover:bg-surface-600 transition-colors">
            <span className="hidden sm:inline max-w-[100px] truncate">{currentCategoryLabel}</span>
            <span className="sm:hidden">All</span>
            <ChevronDown size={14} />
          </button>
          <AnimatePresence>
            {categoryOpen && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-surface-300/50 bg-surface-800 py-1 shadow-lg">
                <button type="button" onClick={() => { setSelectedCategory("all"); setCategoryOpen(false); }} className={cn("w-full px-4 py-2 text-left text-sm hover:bg-surface-700 transition-colors", selectedCategory === "all" && "bg-gold-400/10 text-gold-400 font-medium")}>All Categories</button>
                {categoriesList.map((cat) => (<button key={cat.slug} type="button" onClick={() => { setSelectedCategory(cat.slug); setCategoryOpen(false); }} className={cn("w-full px-4 py-2 text-left text-sm hover:bg-surface-700 transition-colors text-surface-50", selectedCategory === cat.slug && "bg-gold-400/10 text-gold-400 font-medium")}>{cat.name}</button>))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="relative flex-1">
          <input ref={inputRef} type="text" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search for products, brands and more..." className="h-full w-full border border-surface-300 bg-surface-800 px-4 py-2.5 text-sm text-white placeholder:text-surface-100 outline-none focus:border-gold-400 transition-all" />
          {query && (<button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-surface-100 hover:text-white"><X size={16} /></button>)}
        </div>
        <button type="submit" className="rounded-r-xl bg-gold-400 px-5 text-surface-950 hover:bg-gold-300 active:bg-gold-500 transition-colors"><Search size={20} /></button>
      </form>

      <AnimatePresence>
        {open && (query.length > 0 || recentSearches.length > 0) && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[400px] overflow-y-auto rounded-xl border border-surface-300/50 bg-surface-800 shadow-xl">
            {suggestions.length > 0 ? (
              <div className="p-2">
                {suggestions.map((item, idx) => (
                  <button key={`${item.type}-${item.slug}-${idx}`} type="button" onClick={() => {
                    if (item.type === "product") { router.push(`/products/${item.slug}`); setOpen(false); saveSearch(item.text); }
                    else { router.push(`/categories/${item.slug}`); setOpen(false); saveSearch(item.text); }
                  }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-700 transition-colors">
                    {item.type === "product" && item.image ? (
                      <Image src={item.image} alt="" width={32} height={32} className="h-8 w-8 rounded-md object-cover shrink-0" />
                    ) : item.type === "category" ? (
                      <Tag size={14} className="shrink-0 text-gold-400" />
                    ) : (
                      <Search size={14} className="shrink-0 text-surface-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{item.text}</p>
                      <p className="text-xs text-surface-100">{item.type === "category" ? "Category" : item.price ? `₹${item.price}` : ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length >= 2 && !loadingSuggestions ? (<div className="p-4 text-center text-sm text-surface-100">No suggestions found</div>) : query.length >= 2 && loadingSuggestions ? (<div className="p-4 text-center text-sm text-surface-100">Searching...</div>) : null}
            {recentSearches.length > 0 && !query && (
              <div className="border-t border-surface-300/30 p-2">
                <div className="flex items-center justify-between px-3 py-1.5"><span className="text-xs font-semibold text-surface-100 uppercase tracking-wide">Recent Searches</span><button type="button" onClick={clearRecent} className="text-xs text-gold-400 hover:text-gold-300">Clear All</button></div>
                {recentSearches.map((term) => (<button key={term} type="button" onClick={() => handleSuggestionClick(term)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-700 transition-colors"><Clock size={14} className="text-surface-100" /><span className="text-sm text-surface-50">{term}</span></button>))}
              </div>
            )}
            {!query && (
              <div className="border-t border-surface-300/30 p-2">
                <p className="px-3 py-1.5 text-xs font-semibold text-surface-100 uppercase tracking-wide">Popular Searches</p>
                <div className="flex flex-wrap gap-2 px-3 py-2">
                  {popularSearches.map((term) => (<button key={term} type="button" onClick={() => handleSuggestionClick(term)} className="inline-flex items-center gap-1.5 rounded-full border border-surface-300 px-3 py-1.5 text-xs text-surface-50 hover:border-gold-400/50 hover:bg-gold-400/5 hover:text-gold-400 transition-colors"><TrendingUp size={12} />{term}</button>))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
