'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  ChevronLeft,
  User,
  Shield,
  Store,
  Forward,
  Lock,
  Eye,
} from 'lucide-react';
import {
  apiGetTickets,
  apiGetTicketDetail,
  apiReplyTicket,
  apiForwardTicket,
  apiUpdateTicketStatus,
} from '@/lib/api';

interface TicketMsg {
  id: string;
  senderRole: string;
  message: string;
  isInternal: boolean;
  isForwarded: boolean;
  createdAt: string;
  sender?: { id: string; name: string; avatar: string | null; role: string };
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  customerId: string;
  orderId: string | null;
  assignedSellerId: string | null;
  assignedAdminId: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; email?: string };
  messages?: TicketMsg[];
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  OPEN: { icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50', label: 'Open' },
  IN_PROGRESS: { icon: MessageSquare, color: 'text-blue-700', bg: 'bg-blue-50', label: 'In Progress' },
  RESOLVED: { icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Resolved' },
  CLOSED: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Closed' },
};

const priorityConfig: Record<string, { color: string; bg: string }> = {
  LOW: { color: 'text-gray-600', bg: 'bg-gray-100' },
  MEDIUM: { color: 'text-blue-700', bg: 'bg-blue-50' },
  HIGH: { color: 'text-orange-700', bg: 'bg-orange-50' },
  URGENT: { color: 'text-red-700', bg: 'bg-red-50' },
};

function getStatus(s: string) {
  return statusConfig[s] ?? { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: s };
}

function roleIcon(role: string) {
  if (role === 'ADMIN') return <Shield size={14} className="text-primary-600" />;
  if (role === 'SELLER') return <Store size={14} className="text-emerald-600" />;
  return <User size={14} className="text-text-muted" />;
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const [showForward, setShowForward] = useState(false);
  const [forwardSellerId, setForwardSellerId] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [forwarding, setForwarding] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadTickets = (status?: string) => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (status) params.status = status;
    apiGetTickets(params)
      .then((data: any) => setTickets(data?.tickets || []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTickets(filterStatus); }, [filterStatus]);

  const openTicket = async (id: string) => {
    setDetailLoading(true);
    try {
      const data: any = await apiGetTicketDetail(id);
      setSelected(data);
    } catch (e: any) {
      alert(e.message || 'Failed to load ticket');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages?.length]);

  const handleReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const msg: any = await apiReplyTicket(selected.id, reply, isInternal);
      setSelected((prev) =>
        prev ? { ...prev, messages: [...(prev.messages || []), msg] } : prev,
      );
      setReply('');
      setIsInternal(false);
    } catch (e: any) {
      alert(e.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleForward = async () => {
    if (!forwardSellerId.trim() || !selected) return;
    setForwarding(true);
    try {
      const updated: any = await apiForwardTicket(selected.id, forwardSellerId, forwardNote || undefined);
      setSelected(updated);
      setShowForward(false);
      setForwardSellerId('');
      setForwardNote('');
    } catch (e: any) {
      alert(e.message || 'Failed to forward ticket');
    } finally {
      setForwarding(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selected) return;
    try {
      const updated: any = await apiUpdateTicketStatus(selected.id, status);
      setSelected(updated);
      loadTickets(filterStatus);
    } catch (e: any) {
      alert(e.message || 'Failed to update status');
    }
  };

  // ─── Detail view ───
  if (selected) {
    const st = getStatus(selected.status);
    const StatusIcon = st.icon;
    const pr = priorityConfig[selected.priority] || priorityConfig.MEDIUM;

    return (
      <div className="p-6 flex flex-col h-[calc(100vh-32px)] min-h-[500px]">
        {/* Header */}
        <div className="shrink-0 mb-4">
          <button
            onClick={() => { setSelected(null); loadTickets(filterStatus); }}
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors mb-3"
          >
            <ChevronLeft size={16} /> Back to Tickets
          </button>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-text-primary">{selected.subject}</h2>
              <p className="text-xs text-text-muted">
                #{selected.ticketNumber} · {selected.customer?.name} ({selected.customer?.email})
              </p>
              {selected.assignedSellerId && (
                <p className="text-xs text-emerald-600 mt-0.5">Assigned to seller: {selected.assignedSellerId}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${st.color} ${st.bg}`}>
                <StatusIcon size={13} /> {st.label}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pr.color} ${pr.bg}`}>
                {selected.priority}
              </span>
              <select
                value={selected.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded-lg border border-border px-2 py-1 text-xs font-medium"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              <button
                onClick={() => setShowForward(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-primary hover:bg-gray-50 transition-colors"
              >
                <Forward size={13} /> Forward to Seller
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
          {detailLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : (
            (selected.messages || []).map((msg, i) => {
              const isAdmin = msg.senderRole === 'ADMIN';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.isInternal
                      ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-br-md'
                      : isAdmin
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : msg.senderRole === 'SELLER'
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-bl-md'
                          : 'bg-gray-100 text-text-primary rounded-bl-md'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.isInternal && <Lock size={12} className="text-amber-600" />}
                      {!msg.isInternal && roleIcon(msg.senderRole)}
                      <span className={`text-xs font-semibold ${msg.isInternal ? 'text-amber-700' : ''}`}>
                        {msg.sender?.name || msg.senderRole}
                        {msg.isInternal && ' (Internal Note)'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-[10px] mt-1.5 ${
                      isAdmin && !msg.isInternal ? 'text-white/60' : 'text-text-muted'
                    }`}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {new Date(msg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        {selected.status !== 'CLOSED' && (
          <div className="shrink-0 space-y-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Eye size={13} /> Internal note (not visible to customer/seller)
              </label>
            </div>
            <div className="flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleReply(); } }}
                placeholder={isInternal ? 'Add internal note…' : 'Reply to customer…'}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:border-transparent ${
                  isInternal ? 'border-amber-300 bg-amber-50 focus:ring-amber-400' : 'border-border focus:ring-primary-500'
                }`}
              />
              <button
                onClick={() => void handleReply()}
                disabled={sending || !reply.trim()}
                className={`flex items-center justify-center rounded-xl px-4 text-white transition-colors disabled:opacity-50 ${
                  isInternal ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        )}

        {/* Forward Modal */}
        {showForward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Forward size={18} /> Forward to Seller
              </h3>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Seller User ID *</label>
                <input
                  value={forwardSellerId}
                  onChange={(e) => setForwardSellerId(e.target.value)}
                  placeholder="Enter seller's user ID"
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Note (optional)</label>
                <textarea
                  value={forwardNote}
                  onChange={(e) => setForwardNote(e.target.value)}
                  placeholder="Internal note about why this is being forwarded…"
                  rows={2}
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForward(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleForward()}
                  disabled={forwarding || !forwardSellerId.trim()}
                  className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forwarding ? <Loader2 size={14} className="animate-spin" /> : null}
                  Forward
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // ─── List view ───
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-text-primary font-display">Support Tickets</h1>
        <div className="flex items-center gap-2">
          {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-danger-500" />
          <p className="mt-3 text-sm">{error}</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare size={40} className="text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-text-primary">No tickets</h3>
          <p className="text-sm text-text-secondary mt-1">
            {filterStatus ? `No ${filterStatus.toLowerCase().replace('_', ' ')} tickets.` : 'No support tickets yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/80">
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">Ticket</th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const st = getStatus(ticket.status);
                const StatusIcon = st.icon;
                const pr = priorityConfig[ticket.priority] || priorityConfig.MEDIUM;
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => openTicket(ticket.id)}
                    className="border-b border-border last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary truncate max-w-[250px]">{ticket.subject}</p>
                      <p className="text-xs text-text-muted">#{ticket.ticketNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {ticket.customer?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color} ${st.bg}`}>
                        <StatusIcon size={12} /> {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pr.color} ${pr.bg}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {new Date(ticket.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
