import { api } from './client';

export const createPaymentOrder = (orderId: string) => api.post(`/payment/create-order/${orderId}`);
export const verifyPayment = (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
  api.post('/payment/verify', data);
