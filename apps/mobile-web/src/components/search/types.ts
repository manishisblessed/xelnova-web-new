export interface SearchFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
}

const SORT_LABELS: Record<NonNullable<SearchFilters['sortBy']>, string> = {
  relevance: 'Relevance',
  price_asc: 'Price low',
  price_desc: 'Price high',
  rating: 'Top rated',
  newest: 'Newest',
};

/** Returns a short array of human-readable chips for currently active filters. */
export function describeActiveFilters(f: SearchFilters): string[] {
  const out: string[] = [];
  if (f.sortBy && f.sortBy !== 'relevance') out.push(SORT_LABELS[f.sortBy]);
  if (f.minPrice != null || f.maxPrice != null) {
    if (f.maxPrice != null && f.minPrice != null) {
      out.push(`\u20B9${f.minPrice} - \u20B9${f.maxPrice}`);
    } else if (f.maxPrice != null) {
      out.push(`Under \u20B9${f.maxPrice}`);
    } else if (f.minPrice != null) {
      out.push(`Over \u20B9${f.minPrice}`);
    }
  }
  if (f.minRating != null) out.push(`${f.minRating}\u2605 & up`);
  if (f.brand) out.push(f.brand);
  if (f.category) out.push(f.category);
  return out;
}

export function countActiveFilters(f: SearchFilters): number {
  let n = 0;
  if (f.sortBy && f.sortBy !== 'relevance') n++;
  if (f.minPrice != null || f.maxPrice != null) n++;
  if (f.minRating != null) n++;
  if (f.brand) n++;
  if (f.category) n++;
  return n;
}
