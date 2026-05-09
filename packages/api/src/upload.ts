import { api } from './client';
import type { ApiResponse } from './types';

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ApiResponse<{ url: string; publicId: string }>>('/upload/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!data.success || !data.data?.url) {
    throw new Error(data.message || 'Upload failed');
  }
  return data.data.url;
}
