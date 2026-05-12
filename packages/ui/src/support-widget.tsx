"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Headphones,
  HelpCircle,
  Loader2,
  MessageCircle,
  Package,
  RotateCcw,
  Send,
  Truck,
  User,
  UserCog,
  X,
} from "lucide-react";
import { cn } from "@xelnova/utils";

export type SupportWidgetAudience = "customer" | "seller";

// ─── Quick-action intents ───

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  message: string;
  needsOrder: boolean;
}

const CUSTOMER_ACTIONS: QuickAction[] = [
  { id: "order", label: "Order Status", icon: Package, message: "Where is my order?", needsOrder: true },
  { id: "shipping", label: "Shipping Details", icon: Truck, message: "I need shipping details for my order", needsOrder: true },
  { id: "return", label: "Returns & Replacement", icon: RotateCcw, message: "How do returns work?", needsOrder: false },
  { id: "refund", label: "Refund Status", icon: CreditCard, message: "What is my refund status?", needsOrder: true },
  { id: "payment", label: "Payment Issues", icon: CreditCard, message: "I have a payment issue", needsOrder: false },
  { id: "account", label: "Account Help", icon: UserCog, message: "I need help with my account", needsOrder: false },
];

const SELLER_ACTIONS: QuickAction[] = [
  { id: "orders", label: "Orders & Shipping", icon: Package, message: "I need help with an order", needsOrder: false },
  { id: "payouts", label: "Payouts & Settlement", icon: CreditCard, message: "How do payouts work?", needsOrder: false },
  { id: "support", label: "Talk to Support", icon: Headphones, message: "I need to talk to support", needsOrder: false },
];

// ─── Chat message types ───

interface ChatMsg {
  id: string;
  role: "user" | "bot" | "system";
  text: string;
  timestamp: Date;
}

// ─── Tawk.to loader (kept for backwards compat) ───

function TawkLoader() {
  useEffect(() => {
    const propId =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim()
        : "";
    const widgetId =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim()
        : "";
    if (!propId || !widgetId || typeof window === "undefined") return;
    if (document.getElementById("tawkto-xelnova")) return;

    const s = document.createElement("script");
    s.id = "tawkto-xelnova";
    s.async = true;
    s.src = `https://embed.tawk.to/${propId}/${widgetId}`;
    s.charset = "UTF-8";
    s.setAttribute("crossorigin", "*");
    document.head.appendChild(s);
  }, []);
  return null;
}

export interface SupportWidgetProps {
  audience: SupportWidgetAudience;
  subheading?: ReactNode;
  className?: string;
  /** Called with (message, orderNumber?) to send to the chatbot API. */
  onChat?: (message: string, orderNumber?: string) => Promise<{
    resolved: boolean;
    reply: string;
    ticketId?: string;
  }>;
}

let _msgId = 0;
function nextId() {
  return `msg-${++_msgId}-${Date.now()}`;
}

/**
 * Floating support widget with interactive chatbot.
 *
 * When `NEXT_PUBLIC_TAWK_PROPERTY_ID` and `NEXT_PUBLIC_TAWK_WIDGET_ID`
 * are set, falls back to Tawk.to embed. Otherwise renders an in-app
 * chat interface that talks to the ticket chatbot API.
 */
export function SupportWidget({
  audience,
  subheading,
  className,
  onChat,
}: SupportWidgetProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"home" | "chat">("home");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderPrompt, setOrderPrompt] = useState(false);
  const [orderInput, setOrderInput] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tawkEnabled = useMemo(() => {
    const a = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim();
    const b = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim();
    return Boolean(a && b);
  }, []);

  const actions = audience === "seller" ? SELLER_ACTIONS : CUSTOMER_ACTIONS;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  useEffect(() => {
    if (view === "chat" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view, orderPrompt]);

  const addBotMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "bot", text, timestamp: new Date() },
    ]);
  }, []);

  const sendToBot = useCallback(
    async (msg: string, orderNumber?: string) => {
      if (!onChat) {
        addBotMessage(
          "Our support team is available at support@xelnova.in or call +91 9259131155. You can also create a ticket from Account → Support.",
        );
        return;
      }

      setLoading(true);
      try {
        const res = await onChat(msg, orderNumber);
        addBotMessage(res.reply);
        if (res.ticketId) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "system",
              text: `Ticket created. You can track it in Account → Support.`,
              timestamp: new Date(),
            },
          ]);
        }
      } catch {
        addBotMessage(
          "Sorry, something went wrong. Please try again or contact support@xelnova.in.",
        );
      } finally {
        setLoading(false);
      }
    },
    [onChat, addBotMessage],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", text, timestamp: new Date() },
    ]);

    const wantsHuman = /\btalk\s+to\s+(?:support|human|agent|person)\b/i.test(text);
    if (wantsHuman) {
      await sendToBot(text);
      return;
    }

    await sendToBot(text);
  }, [input, sendToBot]);

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      setView("chat");
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text: action.label, timestamp: new Date() },
      ]);

      if (action.needsOrder) {
        setPendingMessage(action.message);
        setOrderPrompt(true);
        addBotMessage(
          "Sure! Please enter your order number so I can look that up for you.",
        );
      } else {
        void sendToBot(action.message);
      }
    },
    [sendToBot, addBotMessage],
  );

  const handleOrderSubmit = useCallback(async () => {
    const num = orderInput.trim();
    if (!num) return;
    setOrderPrompt(false);
    setOrderInput("");
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", text: `Order: ${num}`, timestamp: new Date() },
    ]);
    await sendToBot(pendingMessage || "Order status", num);
    setPendingMessage("");
  }, [orderInput, pendingMessage, sendToBot]);

  const handleSkipOrder = useCallback(async () => {
    setOrderPrompt(false);
    setOrderInput("");
    await sendToBot(pendingMessage || "I need help");
    setPendingMessage("");
  }, [pendingMessage, sendToBot]);

  const resetChat = useCallback(() => {
    setView("home");
    setMessages([]);
    setInput("");
    setOrderPrompt(false);
    setOrderInput("");
    setPendingMessage("");
  }, []);

  if (tawkEnabled) {
    return <TawkLoader />;
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-4 right-4 z-[90] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6",
          className,
        )}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="mb-1 w-[min(100vw-2rem,24rem)] max-h-[min(80dvh,32rem)] flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-border bg-primary-600 px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  {view === "chat" && (
                    <button
                      type="button"
                      onClick={resetChat}
                      className="rounded-lg p-1 text-white/70 hover:text-white hover:bg-white/10"
                      aria-label="Back to menu"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <MessageCircle size={15} className="shrink-0" />
                      {audience === "seller" ? "Seller Support" : "Help & Support"}
                    </p>
                    {subheading ? (
                      <p className="text-[11px] text-white/60 truncate">{subheading}</p>
                    ) : (
                      <p className="text-[11px] text-white/60">
                        {view === "chat" ? "Chat with our bot" : "How can we help?"}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10"
                  aria-label="Close support"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              {view === "home" ? (
                /* ─── Home: Quick Actions ─── */
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted px-1">
                    What do you need help with?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {actions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => handleQuickAction(action)}
                          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-3 text-center transition-all hover:border-primary-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                            <Icon size={18} />
                          </span>
                          <span className="text-[11px] font-medium text-text-primary leading-tight">
                            {action.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setView("chat");
                        addBotMessage(
                          "Hi! I'm Xelnova's support assistant. Ask me anything about your orders, shipping, returns, or account. Type your question below.",
                        );
                      }}
                      className="w-full flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2.5 text-xs font-medium text-text-primary hover:border-primary-300 hover:shadow-sm transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <HelpCircle size={14} className="text-primary-500" />
                        Ask a question
                      </span>
                      <ChevronRight size={14} className="text-text-muted" />
                    </button>
                  </div>

                  <p className="text-center text-[10px] text-text-muted">
                    Or call +91 9259131155 · support@xelnova.in
                  </p>
                </div>
              ) : (
                /* ─── Chat View ─── */
                <>
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
                    {messages.map((msg) => {
                      if (msg.role === "system") {
                        return (
                          <div
                            key={msg.id}
                            className="text-center text-[10px] text-text-muted py-1"
                          >
                            {msg.text}
                          </div>
                        );
                      }
                      const isUser = msg.role === "user";
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                              isUser
                                ? "bg-primary-600 text-white rounded-br-md"
                                : "bg-gray-100 text-text-primary rounded-bl-md",
                            )}
                          >
                            {!isUser && (
                              <div className="flex items-center gap-1.5 mb-1">
                                <Headphones size={12} className="text-primary-500" />
                                <span className="text-[10px] font-semibold text-primary-600">
                                  Xelnova Bot
                                </span>
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                            <p
                              className={cn(
                                "text-[9px] mt-1",
                                isUser ? "text-white/50" : "text-text-muted",
                              )}
                            >
                              {msg.timestamp.toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}

                    {loading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                          <div className="flex gap-1">
                            <span className="h-2 w-2 rounded-full bg-text-muted/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-2 w-2 rounded-full bg-text-muted/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="h-2 w-2 rounded-full bg-text-muted/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Order number prompt */}
                  {orderPrompt ? (
                    <div className="shrink-0 border-t border-border px-3 py-2.5 space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={orderInput}
                          onChange={(e) => setOrderInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleOrderSubmit();
                            }
                          }}
                          placeholder="e.g. ORD-ABC123"
                          className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                          autoFocus
                        />
                        <button
                          onClick={() => void handleOrderSubmit()}
                          disabled={!orderInput.trim()}
                          className="flex items-center justify-center rounded-lg bg-primary-600 px-3 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSkipOrder()}
                        className="w-full text-[11px] text-text-muted hover:text-primary-600 transition-colors"
                      >
                        Skip — I don't have my order number
                      </button>
                    </div>
                  ) : (
                    /* Chat input */
                    <div className="shrink-0 border-t border-border px-3 py-2.5">
                      <div className="flex gap-2">
                        <input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void handleSend();
                            }
                          }}
                          placeholder="Type your question…"
                          disabled={loading}
                          className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent disabled:opacity-50"
                        />
                        <button
                          onClick={() => void handleSend()}
                          disabled={loading || !input.trim()}
                          className="flex items-center justify-center rounded-lg bg-primary-600 px-3 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                          {loading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Send size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className={cn(
            "inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg",
            "bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2",
          )}
          aria-expanded={open}
          aria-label={open ? "Close help" : "Open help"}
        >
          {open ? <X size={22} /> : <MessageCircle size={22} />}
        </motion.button>
      </div>
    </>
  );
}
