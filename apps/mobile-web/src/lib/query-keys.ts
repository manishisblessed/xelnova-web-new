/**
 * Centralized React Query key factory. Keys are arrays so they sort and
 * invalidate predictably. Always import from here — never inline a key
 * string at the call site.
 */
export const queryKeys = {
  banners: (position: string) => ['banners', position] as const,
  products: {
    list: (params?: Record<string, unknown>) => ['products', 'list', params ?? {}] as const,
    detail: (slug: string) => ['products', 'detail', slug] as const,
    featured: () => ['products', 'featured'] as const,
    flashDeals: () => ['products', 'flash-deals'] as const,
    trending: () => ['products', 'trending'] as const,
    brands: () => ['products', 'brands'] as const,
    topReviews: () => ['products', 'top-reviews'] as const,
  },
  categories: {
    all: () => ['categories', 'all'] as const,
    bySlug: (slug: string) => ['categories', 'detail', slug] as const,
  },
  search: {
    results: (query: string, page: number, filters?: Record<string, unknown> | object) =>
      ['search', 'results', query, page, filters ?? {}] as const,
    autocomplete: (query: string) => ['search', 'autocomplete', query] as const,
    popular: () => ['search', 'popular'] as const,
  },
  store: {
    detail: (slug: string) => ['store', 'detail', slug] as const,
    products: (slug: string, params?: Record<string, unknown>) =>
      ['store', 'products', slug, params ?? {}] as const,
    deals: (slug: string) => ['store', 'deals', slug] as const,
    bestsellers: (slug: string) => ['store', 'bestsellers', slug] as const,
  },
  cart: () => ['cart'] as const,
  shippingConfig: () => ['cart', 'shipping-config'] as const,
  wishlist: {
    items: () => ['wishlist', 'items'] as const,
    ids: () => ['wishlist', 'ids'] as const,
  },
  user: {
    profile: () => ['user', 'profile'] as const,
    addresses: () => ['user', 'addresses'] as const,
  },
  orders: {
    list: () => ['orders', 'list'] as const,
    detail: (orderNumber: string) => ['orders', 'detail', orderNumber] as const,
    refundOptions: (orderNumber: string) => ['orders', 'refund-options', orderNumber] as const,
  },
  tickets: {
    list: () => ['tickets', 'list'] as const,
    detail: (id: string) => ['tickets', 'detail', id] as const,
  },
  returns: {
    list: () => ['returns', 'list'] as const,
  },
  reviews: {
    product: (productId: string, page?: number) =>
      ['reviews', 'product', productId, page ?? 1] as const,
    orderStatus: (orderNumber: string) =>
      ['reviews', 'order-status', orderNumber] as const,
  },
  wallet: {
    balance: () => ['wallet', 'balance'] as const,
    transactions: (page: number) => ['wallet', 'transactions', page] as const,
  },
  notifications: {
    list: () => ['notifications', 'list'] as const,
  },
  loyalty: {
    balance: () => ['loyalty', 'balance'] as const,
    ledger: (page: number) => ['loyalty', 'ledger', page] as const,
    referral: () => ['loyalty', 'referral'] as const,
    referralStats: () => ['loyalty', 'referral-stats'] as const,
  },
} as const;
