import { api } from './client';

export const getDashboard = () => api.get('/seller/dashboard');
export const getProducts = (params?: Record<string, any>) => api.get('/seller/products', { params });
export const getProduct = (id: string) => api.get(`/seller/products/${id}`);
export const createProduct = (data: any) => api.post('/seller/products', data);
export const updateProduct = (id: string, data: any) => api.patch(`/seller/products/${id}`, data);
export const deleteProduct = (id: string) => api.delete(`/seller/products/${id}`);
export const getOrders = (params?: Record<string, any>) => api.get('/seller/orders', { params });
export const updateOrderStatus = (id: string, status: string) => api.patch(`/seller/orders/${id}/status`, { status });
export const getRevenue = (params?: Record<string, any>) => api.get('/seller/revenue', { params });
export const getAnalytics = () => api.get('/seller/analytics');
export const getProfile = () => api.get('/seller/profile');
export const updateProfile = (data: any) => api.patch('/seller/profile', data);
