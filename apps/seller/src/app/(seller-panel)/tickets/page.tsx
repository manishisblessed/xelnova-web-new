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
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import {
  apiGetSellerTickets,
  apiGetSellerTicketDetail,
  apiSellerReplyTicket,
} from '@/lib/api';

interface TicketMsg {
  id: string;
  senderRole: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  sender?: { id: string; name: string; avatar: string | null; role: string };
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string };
  messages?: TicketMsg[];
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  OPEN: { icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50', label: 'Open' },
  IN_PROGRESS: { icon: MessageSquare, color: 'text-blue-700', bg: 'bg-blue-50', label: 'In Progress' },
  RESOLVED: { icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Resolved' },
  CLOSED: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Closed' },
};

function getStatus(s: string) {
  return statusConfig[s] ?? { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: s };
}

function roleIcon(role: string) {
  if (role === 'ADMIN') return <Shield size={14} className="text-primary-600" />;
  if (role === 'SELLER') return <Store size={14} className="text-emerald-600" />;
  return <User size={14} className="text-text-muted" />;
}

export default function SellerTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGetSellerTickets()
      .then((data: any) => setTickets(Array.isArray(data) ? data : []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openTicket = async (id: string) => {
    setDetailLoading(true);
    try {
      const data: any = await apiGetSellerTicketDetail(id);
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

  const handleSend = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const msg: any = await apiSellerReplyTicket(selected.id, reply);
      setSelected((prev) =>
        prev ? { ...prev, messages: [...(prev.messages || []), msg] } : prev,
      );
      setReply('');
    } catch (e: any) {
      alert(e.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Support Tickets" />
      <div className="p-6">
        {selected ? (
          <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px]">
            <div className="shrink-0 mb-4">
              <button
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors mb-3"
              >
                <ChevronLeft size={16} /> Back to Tickets
              </button>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{selected.subject}</h2>
                  <p className="text-xs text-text-muted">
                    #{selected.ticketNumber} · Customer: {selected.customer?.name || 'Unknown'}
                  </p>
                </div>
                {(() => {
                  const st = getStatus(selected.status);
                  const StatusIcon = st.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${st.color} ${st.bg}`}>
                      <StatusIcon size={13} /> {st.label}
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-text-muted mt-1">
                Your replies go to the admin team, who will forward them to the customer.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
              {detailLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : (
                (selected.messages || []).map((msg, i) => {
                  const isMe = msg.senderRole === 'SELLER';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-text-primary rounded-bl-md'
                      }`}>
                        {!isMe && (
                          <div className="flex items-center gap-1.5 mb-1">
                            {roleIcon(msg.senderRole)}
                            <span className="text-xs font-semibold">{msg.sender?.name || msg.senderRole}</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-[10px] mt-1.5 ${isMe ? 'text-white/60' : 'text-text-muted'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {selected.status !== 'CLOSED' && (
              <div className="shrink-0 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                  placeholder="Reply to admin…"
                  className="flex-1 rounded-xl border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={sending || !reply.trim()}
                  className="flex items-center justify-center rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20">
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
            <h3 className="text-lg font-semibold text-text-primary">No tickets assigned</h3>
            <p className="text-sm text-text-secondary mt-1">
              When admin forwards a customer ticket to you, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket, i) => {
              const st = getStatus(ticket.status);
              const StatusIcon = st.icon;
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => openTicket(ticket.id)}
                  className="rounded-2xl border border-border bg-white p-5 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{ticket.subject}</p>
                      <p className="text-xs text-text-muted">#{ticket.ticketNumber} · {ticket.customer?.name}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color} ${st.bg} shrink-0`}>
                      <StatusIcon size={12} /> {st.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Updated {new Date(ticket.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
