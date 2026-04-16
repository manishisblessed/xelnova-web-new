import { api } from './client';
import type { ApiResponse, OrganizationSummary } from './types';

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const { data } = await api.get<ApiResponse<OrganizationSummary[]>>('/business/organizations');
  return data.data;
}

export async function getOrganization(id: string): Promise<OrganizationSummary & { createdAt: string }> {
  const { data } = await api.get<ApiResponse<OrganizationSummary & { createdAt: string }>>(
    `/business/organizations/${id}`,
  );
  return data.data;
}

export async function updateOrganization(
  id: string,
  body: { name?: string; legalName?: string; gstin?: string },
): Promise<{ id: string; name: string; legalName: string | null; gstin: string | null }> {
  const { data } = await api.patch<ApiResponse<{ id: string; name: string; legalName: string | null; gstin: string | null }>>(
    `/business/organizations/${id}`,
    body,
  );
  return data.data;
}
