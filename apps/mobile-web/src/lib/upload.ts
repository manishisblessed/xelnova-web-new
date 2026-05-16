import { api } from '@xelnova/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/**
 * Upload a local image picked from `expo-image-picker` (or a camera capture)
 * to the Xelnova upload service.
 *
 * The web `uploadApi.uploadImage` accepts a `File`, which doesn't exist in
 * React Native. Here we build the multipart payload the way RN expects:
 * a plain object with `uri`, `name`, and `type` cast through FormData.
 */
export async function uploadImageFromUri(opts: {
  uri: string;
  /** File name; defaults to a timestamped jpg. */
  name?: string;
  /** MIME type; defaults to `image/jpeg`. */
  mime?: string;
}): Promise<string> {
  const form = new FormData();
  const fileName = opts.name ?? `upload-${Date.now()}.jpg`;
  const mime = opts.mime ?? 'image/jpeg';

  form.append(
    'file',
    // React Native's FormData polyfill accepts this shape; TS doesn't model it.
    {
      uri: opts.uri,
      name: fileName,
      type: mime,
    } as unknown as Blob,
  );

  const { data } = await api.post<ApiResponse<{ url: string; publicId: string }>>(
    '/upload/image',
    form,
    {
      headers: {
        // Let axios set the multipart boundary itself.
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  if (!data.success || !data.data?.url) {
    throw new Error(data.message || 'Upload failed');
  }
  return data.data.url;
}
