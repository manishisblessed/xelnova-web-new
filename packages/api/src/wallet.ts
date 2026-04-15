import { api } from './client';
import type { ApiResponse } from './types';
import { AxiosError } from 'axios';

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

export interface WalletBalance {
  balance: number;
  walletId: string | null;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  referenceId: string | null;
  createdAt: string;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  balance: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getCustomerBalance(): Promise<WalletBalance> {
  const { data } = await api.get<ApiResponse<WalletBalance>>('/wallet/customer/balance');
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to load wallet balance');
  }
  return data.data;
}

export async function getCustomerTransactions(
  page = 1,
  limit = 20,
): Promise<WalletTransactionsResponse> {
  const { data } = await api.get<ApiResponse<WalletTransactionsResponse>>(
    `/wallet/customer/transactions?page=${page}&limit=${limit}`,
  );
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to load transactions');
  }
  return data.data;
}

export interface AddMoneyOrder {
  razorpayOrderId: string;
  amount: number;
  walletCredit: number;
  convenienceFee: number;
  feePercent: number;
  currency: string;
  keyId: string;
}

export async function createAddMoneyOrder(amount: number): Promise<AddMoneyOrder> {
  try {
    const { data } = await api.post<ApiResponse<AddMoneyOrder>>('/wallet/customer/add-money', { amount });
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to create order');
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to create payment order'));
  }
}

export async function verifyAddMoney(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  try {
    const { data } = await api.post<ApiResponse<unknown>>('/wallet/customer/verify-add-money', payload);
    if (!data.success) throw new Error(data.message || 'Verification failed');
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Payment verification failed'));
  }
}

export async function requestBankTransfer(payload: {
  amount: number;
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
}) {
  try {
    const { data } = await api.post<ApiResponse<unknown>>('/wallet/customer/transfer', payload);
    if (!data.success) throw new Error(data.message || 'Transfer failed');
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Transfer failed'));
  }
}

export async function processRecharge(payload: {
  amount: number;
  identifier: string;
  operator: string;
  type?: string;
}) {
  try {
    const { data } = await api.post<ApiResponse<unknown>>('/wallet/customer/recharge', payload);
    if (!data.success) throw new Error(data.message || 'Recharge failed');
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Recharge failed'));
  }
}

export async function processBillPayment(payload: {
  amount: number;
  billerId: string;
  consumerNumber: string;
  category?: string;
}) {
  try {
    const { data } = await api.post<ApiResponse<unknown>>('/wallet/customer/bill-payment', payload);
    if (!data.success) throw new Error(data.message || 'Bill payment failed');
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Bill payment failed'));
  }
}
