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

export interface KycUrlResponse {
  verificationId: string;
  referenceId: string;
  orderId: string;
  url: string;
  status: string;
  documentRequested?: string;
  redirectUrl?: string;
  message?: string;
}

export interface KycVerifyResponse {
  verified: boolean;
  message: string;
}

export async function createCustomerKycUrl(): Promise<KycUrlResponse> {
  try {
    const { data } = await api.post<ApiResponse<KycUrlResponse>>('/verification/customer/kyc/create-url');
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to create KYC verification URL');
    }
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to create KYC verification URL'));
  }
}

export async function verifyCustomerKyc(payload: {
  verificationId: string;
  referenceId: string;
  orderId: string;
  documentType: 'AADHAAR';
}): Promise<KycVerifyResponse> {
  try {
    const { data } = await api.post<ApiResponse<KycVerifyResponse>>('/verification/customer/kyc/verify', payload);
    if (!data.success || !data.data) {
      throw new Error(data.message || 'KYC verification failed');
    }
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'KYC verification failed'));
  }
}
