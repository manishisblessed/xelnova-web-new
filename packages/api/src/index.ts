// Types
export type * from './types';

// Client
export { api, createApiClient, setAccessToken, getAccessToken } from './client';

// Auth
export * as authApi from './auth';

// API modules
export * as productsApi from './products';
export * as categoriesApi from './categories';
export * as cartApi from './cart';
export * as ordersApi from './orders';
export * as usersApi from './users';
export * as sellersApi from './sellers';
export * as searchApi from './search';
export * as reviewsApi from './reviews';
export * as sellerDashboardApi from './seller-dashboard';
export * as adminApi from './admin';
export * as paymentApi from './payment';
export * as returnsApi from './returns';
export * as walletApi from './wallet';
export * as ticketsApi from './tickets';
export * as notificationsApi from './notifications';
export * as wishlistApi from './wishlist';
export * as verificationApi from './verification';
export * as storesApi from './stores';

// Hooks
export { AuthProvider, useAuth } from './hooks/use-auth';
export { useFetch } from './hooks/use-fetch';
