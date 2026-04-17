import { AxiosError } from 'axios';
import { api } from './client';
import type { ApiResponse } from './types';

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: unknown } | undefined;
    const msg = data?.message;
    if (Array.isArray(msg)) return String(msg[0] ?? fallback);
    if (typeof msg === 'string' && msg.trim()) return msg;
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export interface ContactMessagePayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
}

export async function sendContactMessage(payload: ContactMessagePayload): Promise<{ delivered: boolean }> {
  try {
    const { data } = await api.post<ApiResponse<{ delivered: boolean }>>('/contact/message', payload);
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to send message');
    }
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to send message'));
  }
}

export async function subscribeNewsletter(email: string): Promise<{ subscribed: boolean }> {
  try {
    const { data } = await api.post<ApiResponse<{ subscribed: boolean }>>('/contact/subscribe', { email });
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to subscribe');
    }
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Failed to subscribe'));
  }
}
