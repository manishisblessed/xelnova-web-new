import { api } from './client';
import type { ApiResponse } from './types';

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
