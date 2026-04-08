"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  HelpCircle,
  Loader2,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { ticketsApi, setAccessToken } from "@xelnova/api";

type Ticket = Awaited<ReturnType<typeof ticketsApi.getMyTickets>>[number];

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  OPEN: { icon: Clock, color: "text-amber-700", bg: "bg-amber-50", label: "Open" },
  IN_PROGRESS: { icon: MessageSquare, color: "text-blue-700", bg: "bg-blue-50", label: "In Progress" },
  RESOLVED: { icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50", label: "Resolved" },
  CLOSED: { icon: XCircle, color: "text-gray-600", bg: "bg-gray-100", label: "Closed" },
};

function getStatus(s: string) {
  return statusConfig[s] ?? { icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-50", label: s };
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [creating, setCreating] = useState(false);

  const loadTickets = () => {
    syncToken();
    ticketsApi
      .getMyTickets()
      .then(setTickets)
      .catch((e: { message?: string }) => setError(e.message ?? "Failed to load tickets"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTickets(); }, []);

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) return;
    setCreating(true);
    try {
      syncToken();
      await ticketsApi.createTicket(subject, message, orderNumber || undefined);
      setShowCreate(false);
      setSubject("");
      setMessage("");
      setOrderNumber("");
      setLoading(true);
      loadTickets();
    } catch (e: any) {
      alert(e.message || "Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Support Tickets</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          <p className="mt-4 text-sm text-text-secondary">Loading tickets…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-danger-500" />
          <p className="mt-3 text-sm text-text-primary">{error}</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white py-16 text-center shadow-card">
          <div className="rounded-full bg-primary-50 p-5 mb-4">
            <HelpCircle size={36} className="text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">No tickets yet</h3>
          <p className="mt-1 text-sm text-text-secondary max-w-xs">
            Need help? Create a support ticket and our team will assist you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket, i) => {
            const st = getStatus(ticket.status);
            const StatusIcon = st.icon;
            const lastMsg = ticket.messages?.[0];
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/account/support/${ticket.id}`}
                  className="block rounded-2xl border border-border bg-white p-5 shadow-card hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{ticket.subject}</p>
                      <p className="text-xs text-text-muted">#{ticket.ticketNumber}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color} ${st.bg} shrink-0`}>
                      <StatusIcon size={12} /> {st.label}
                    </span>
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-text-secondary line-clamp-2">{lastMsg.message}</p>
                  )}
                  <p className="text-[11px] text-text-muted mt-2">
                    {new Date(ticket.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-text-primary">Create Support Ticket</h3>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Subject *</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Order Number <span className="text-text-muted">(optional)</span>
              </label>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. XN-2026-123456"
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail…"
                rows={4}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={creating || !subject.trim() || !message.trim()}
                className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                Submit Ticket
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
