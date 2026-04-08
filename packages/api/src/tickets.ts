import { api } from './client';
import type { ApiResponse } from './types';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  message: string;
  isInternal: boolean;
  isForwarded: boolean;
  createdAt: string;
  sender: { id: string; name: string; avatar: string | null; role: string };
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  customerId: string;
  orderId: string | null;
  assignedSellerId: string | null;
  assignedAdminId: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; email?: string; avatar?: string | null };
  messages?: TicketMessage[];
}

// ─── Customer ───

export async function createTicket(
  subject: string,
  message: string,
  orderNumber?: string,
): Promise<Ticket> {
  const { data } = await api.post<ApiResponse<Ticket>>('/tickets', {
    subject,
    message,
    orderNumber,
  });
  if (!data.success || !data.data) throw new Error(data.message || 'Failed to create ticket');
  return data.data;
}

export async function getMyTickets(): Promise<Ticket[]> {
  const { data } = await api.get<ApiResponse<Ticket[]>>('/tickets/my');
  if (!data.success || !data.data) throw new Error(data.message || 'Failed to load tickets');
  return data.data;
}

export async function getMyTicketDetail(id: string): Promise<Ticket> {
  const { data } = await api.get<ApiResponse<Ticket>>(`/tickets/my/${id}`);
  if (!data.success || !data.data) throw new Error(data.message || 'Ticket not found');
  return data.data;
}

export async function replyToMyTicket(id: string, message: string): Promise<TicketMessage> {
  const { data } = await api.post<ApiResponse<TicketMessage>>(`/tickets/my/${id}/reply`, { message });
  if (!data.success || !data.data) throw new Error(data.message || 'Failed to send reply');
  return data.data;
}
