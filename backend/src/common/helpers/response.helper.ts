import { ApiResponse, PaginationMeta } from '../interfaces/api-response.interface';

export function successResponse<T>(
  data: T,
  message: string = 'Success',
): ApiResponse<T> {
  return { success: true, data, message };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Success',
): ApiResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  const meta: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
  return { success: true, data, message, meta };
}

export function errorResponse(message: string): ApiResponse<null> {
  return { success: false, data: null, message };
}
