import { api } from './client';

// Dashboard
export const getDashboard = () => api.get('/admin/dashboard');

// Products
export const getProducts = (params?: Record<string, any>) => api.get('/admin/products', { params });
export const updateProduct = (id: string, data: any) => api.patch(`/admin/products/${id}`, data);
export const deleteProduct = (id: string) => api.delete(`/admin/products/${id}`);

// Orders
export const getOrders = (params?: Record<string, any>) => api.get('/admin/orders', { params });
export const updateOrder = (id: string, data: any) => api.patch(`/admin/orders/${id}`, data);

// Sellers
export const getSellers = (params?: Record<string, any>) => api.get('/admin/sellers', { params });
export const updateSeller = (id: string, data: any) => api.patch(`/admin/sellers/${id}`, data);

// Customers
export const getCustomers = (params?: Record<string, any>) => api.get('/admin/customers', { params });
export const updateCustomer = (id: string, data: any) => api.patch(`/admin/customers/${id}`, data);

// Categories
export const getCategories = () => api.get('/admin/categories');
export const createCategory = (data: any) => api.post('/admin/categories', data);
export const updateCategory = (id: string, data: any) => api.patch(`/admin/categories/${id}`, data);
export const deleteCategory = (id: string) => api.delete(`/admin/categories/${id}`);

// Brands
export const getBrands = () => api.get('/admin/brands');
export const createBrand = (data: any) => api.post('/admin/brands', data);
export const updateBrand = (id: string, data: any) => api.patch(`/admin/brands/${id}`, data);
export const deleteBrand = (id: string) => api.delete(`/admin/brands/${id}`);

// Banners
export const getBanners = () => api.get('/admin/banners');
export const createBanner = (data: any) => api.post('/admin/banners', data);
export const updateBanner = (id: string, data: any) => api.patch(`/admin/banners/${id}`, data);
export const deleteBanner = (id: string) => api.delete(`/admin/banners/${id}`);

// Coupons
export const getCoupons = () => api.get('/admin/coupons');
export const createCoupon = (data: any) => api.post('/admin/coupons', data);
export const updateCoupon = (id: string, data: any) => api.patch(`/admin/coupons/${id}`, data);
export const deleteCoupon = (id: string) => api.delete(`/admin/coupons/${id}`);

// Commission
export const getCommissionRules = () => api.get('/admin/commission');
export const createCommissionRule = (data: any) => api.post('/admin/commission', data);
export const updateCommissionRule = (id: string, data: any) => api.patch(`/admin/commission/${id}`, data);
export const deleteCommissionRule = (id: string) => api.delete(`/admin/commission/${id}`);

// Payouts
export const getPayouts = (params?: Record<string, any>) => api.get('/admin/payouts', { params });
export const updatePayout = (id: string, data: any) => api.patch(`/admin/payouts/${id}`, data);

// CMS Pages
export const getPages = () => api.get('/admin/pages');
export const createPage = (data: any) => api.post('/admin/pages', data);
export const updatePage = (id: string, data: any) => api.patch(`/admin/pages/${id}`, data);
export const deletePage = (id: string) => api.delete(`/admin/pages/${id}`);

// Revenue
export const getRevenue = (params?: Record<string, any>) => api.get('/admin/revenue', { params });

// Activity
export const getActivityLogs = (params?: Record<string, any>) => api.get('/admin/activity', { params });

// Upload
export const uploadImage = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const uploadImages = (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return api.post('/upload/images', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
