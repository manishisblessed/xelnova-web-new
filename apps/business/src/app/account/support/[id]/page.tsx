"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Send,
  User,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Store,
} from "lucide-react";
import { ticketsApi, setAccessToken } from "@xelnova/api";

type Ticket = Awaited<ReturnType<typeof ticketsApi.getMyTicketDetail>>;

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  OPEN: { icon: Clock, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: "Open" },
  IN_PROGRESS: { icon: MessageSquare, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", label: "In Progress" },
  RESOLVED: { icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: "Resolved" },
  CLOSED: { icon: XCircle, color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-200", label: "Closed" },
};

function getStatus(s: string) {
  return statusConfig[s] ?? { icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", label: s };
}

function senderIcon(role: string) {
  if (role === "SELLER") return <Store size={14} className="text-emerald-600" />;
  if (role === "ADMIN") return <Shield size={14} className="text-primary-600" />;
  return <User size={14} className="text-text-muted" />;
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadTicket = useCallback(() => {
    syncToken();
    ticketsApi
      .getMyTicketDetail(params.id)
      .then(setTicket)
      .catch((e: { message?: string }) => setError(e.message ?? "Ticket not found"))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { loadTicket(); }, [loadTicket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length]);

  const handleSend = async () => {
    if (!reply.trim() || !ticket) return;
    setSending(true);
    try {
      syncToken();
      const msg = await ticketsApi.replyToMyTicket(ticket.id, reply);
      setTicket((prev) =>
        prev ? { ...prev, messages: [...(prev.messages || []), msg], status: "OPEN" } : prev,
      );
      setReply("");
    } catch (e: any) {
      alert(e.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto h-12 w-12 text-danger-500" />
        <h2 className="mt-4 text-lg font-bold text-text-primary">Ticket Not Found</h2>
        <Link href="/account/support" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600">
          <ChevronLeft size={14} /> Back to Support
        </Link>
      </div>
    );
  }

  const st = getStatus(ticket.status);
  const StatusIcon = st.icon;
  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <Link href="/account/support" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors mb-3">
          <ChevronLeft size={16} /> Back to Support
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{ticket.subject}</h2>
            <p className="text-xs text-text-muted">#{ticket.ticketNumber} · Created {new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${st.color} ${st.bg} ${st.border}`}>
            <StatusIcon size={13} /> {st.label}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {(ticket.messages || []).map((msg, i) => {
          const isMe = msg.senderRole === "CUSTOMER";
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isMe
                  ? "bg-primary-600 text-white rounded-br-md"
                  : "bg-gray-100 text-text-primary rounded-bl-md"
              }`}>
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1">
                    {senderIcon(msg.senderRole)}
                    <span className="text-xs font-semibold">{msg.sender?.name || "Support"}</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className={`text-[10px] mt-1.5 ${isMe ? "text-white/60" : "text-text-muted"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {!isClosed ? (
        <div className="shrink-0 flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            placeholder="Type your message…"
            className="flex-1 rounded-xl border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={() => void handleSend()}
            disabled={sending || !reply.trim()}
            className="flex items-center justify-center rounded-xl bg-primary-600 px-4 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      ) : (
        <div className="shrink-0 rounded-xl bg-gray-50 border border-border px-4 py-3 text-center text-sm text-text-muted">
          This ticket is closed. Create a new ticket if you need further help.
        </div>
      )}
    </div>
  );
}
