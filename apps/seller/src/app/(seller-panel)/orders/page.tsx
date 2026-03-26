'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Package, Truck, CheckCircle, XCircle, Clock, Search,
  ChevronDown, ArrowRight, MapPin, Phone, User, CreditCard,
  PackageCheck, PackageX, ClipboardList, Filter, RefreshCw,
  Copy, Calendar, ShoppingBag, AlertTriangle, Loader2, ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Badge } from '@xelnova/ui';
import { apiGetOrders, apiUpdateOrderStatus } from '@/lib/api';

interface OrderProduct {
  name: string;
  images?: string[];
}

interface SellerOrderItem {
  product?: OrderProduct | null;
  productName?: string;
  productImage?: string | null;
  quantity: number;
  price: number;
}

interface SellerOrder {
  id: string;
  orderNumber: string;
  total: number;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  discount?: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  createdAt: string;
  estimatedDelivery?: string;
  user: { name: string; email: string; phone?: string };
  items: SellerOrderItem[];
  shippingAddress?: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Package; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  PENDING:    { label: 'Pending',    color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200', icon: Clock,        variant: 'warning' },
  PROCESSING: { label: 'Processing', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',  icon: Package,      variant: 'info' },
  CONFIRMED:  { label: 'Confirmed',  color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200',icon: ClipboardList,variant: 'info' },
  SHIPPED:    { label: 'Shipped',    color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200',icon: Truck,        variant: 'info' },
  DELIVERED:  { label: 'Delivered',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle, variant: 'success' },
  CANCELLED:  { label: 'Cancelled',  color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',   icon: XCircle,      variant: 'danger' },
  RETURNED:   { label: 'Returned',   color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',icon: PackageX,     variant: 'danger' },
  REFUNDED:   { label: 'Refunded',   color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-200',  icon: CreditCard,   variant: 'default' },
};

const FULFILLMENT_FLOW: Record<string, { nextStatus: string; actionLabel: string; actionIcon: typeof Package; actionColor: string }> = {
  PENDING:    { nextStatus: 'CONFIRMED',  actionLabel: 'Accept Order',    actionIcon: CheckCircle,  actionColor: 'bg-blue-600 hover:bg-blue-700' },
  PROCESSING: { nextStatus: 'CONFIRMED',  actionLabel: 'Confirm Order',   actionIcon: ClipboardList,actionColor: 'bg-blue-600 hover:bg-blue-700' },
  CONFIRMED:  { nextStatus: 'SHIPPED',    actionLabel: 'Mark as Shipped', actionIcon: Truck,        actionColor: 'bg-purple-600 hover:bg-purple-700' },
  SHIPPED:    { nextStatus: 'DELIVERED',   actionLabel: 'Mark Delivered',  actionIcon: PackageCheck, actionColor: 'bg-emerald-600 hover:bg-emerald-700' },
};

function normalizeOrders(res: unknown): SellerOrder[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && 'items' in res && Array.isArray((res as { items: unknown }).items)) {
    return (res as { items: SellerOrder[] }).items;
  }
  return [];
}

function itemImg(line: SellerOrderItem): string | undefined {
  return line.product?.images?.[0] || line.productImage || undefined;
}

function itemName(line: SellerOrderItem): string {
  return line.product?.name || line.productName || 'Product';
}

function fmt(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

type TabFilter = 'all' | 'action_required' | 'shipped' | 'delivered' | 'cancelled';

const TABS: { id: TabFilter; label: string; statuses: string[] }[] = [
  { id: 'all',             label: 'All Orders',       statuses: [] },
  { id: 'action_required', label: 'Action Required',  statuses: ['PENDING', 'PROCESSING', 'CONFIRMED'] },
  { id: 'shipped',         label: 'Shipped',          statuses: ['SHIPPED'] },
  { id: 'delivered',       label: 'Delivered',        statuses: ['DELIVERED'] },
  { id: 'cancelled',       label: 'Cancelled',        statuses: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
];

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SellerOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetOrders();
      setOrders(normalizeOrders(res));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setSaving(true);
    try {
      await apiUpdateOrderStatus(orderId, newStatus);
      toast.success(`Order updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      if (detail?.id === orderId) setDetail((d) => d ? { ...d, status: newStatus } : d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    await handleStatusUpdate(orderId, 'CANCELLED');
  };

  const filtered = orders.filter((o) => {
    const tab = TABS.find((t) => t.id === activeTab)!;
    if (tab.statuses.length > 0 && !tab.statuses.includes(o.status)) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.orderNumber.toLowerCase().includes(q) || o.user?.name?.toLowerCase().includes(q) || o.user?.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    all: orders.length,
    action_required: orders.filter((o) => ['PENDING', 'PROCESSING', 'CONFIRMED'].includes(o.status)).length,
    shipped: orders.filter((o) => o.status === 'SHIPPED').length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    cancelled: orders.filter((o) => ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(o.status)).length,
  };

  if (detail) {
    return <OrderDetail order={detail} onBack={() => setDetail(null)} onStatusUpdate={handleStatusUpdate} onCancel={handleCancel} saving={saving} />;
  }

  return (
    <>
      <DashboardHeader title="Order Management" />
      <div className="p-6 space-y-5">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Action Required', count: counts.action_required, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Shipped', count: counts.shipped, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Delivered', count: counts.delivered, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Orders', count: counts.all, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-white p-4 flex items-center gap-3"
            >
              <div className={`rounded-lg p-2 ${s.bg}`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{loading ? '—' : s.count}</p>
                <p className="text-xs text-text-muted">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'text-primary-600'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                  {counts[tab.id] > 0 && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {counts[tab.id]}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div layoutId="orderTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-gray-50 text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:ring-1 focus:ring-primary-400/30 outline-none w-48"
                />
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg border border-border hover:bg-gray-50 text-text-muted hover:text-text-primary transition-colors"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Order list */}
          <div className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="h-16 w-16 rounded-lg bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-gray-100 rounded" />
                      <div className="h-3 w-32 bg-gray-100 rounded" />
                      <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Package size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-text-muted text-sm">No orders found</p>
              </div>
            ) : (
              filtered.map((order) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                const flow = FULFILLMENT_FLOW[order.status];
                const StatusIcon = cfg.icon;
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Item image */}
                      <div className="relative h-16 w-16 rounded-lg border border-border bg-gray-50 overflow-hidden shrink-0">
                        {order.items?.[0] && itemImg(order.items[0]) ? (
                          <img src={itemImg(order.items[0])!} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package size={20} className="text-gray-300" />
                          </div>
                        )}
                        {order.items.length > 1 && (
                          <span className="absolute bottom-0 right-0 bg-gray-800 text-white text-[10px] font-bold px-1 rounded-tl">
                            +{order.items.length - 1}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-text-primary">{order.orderNumber}</span>
                          <Badge variant={cfg.variant}>
                            <StatusIcon size={10} className="mr-0.5" />
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary mt-0.5 truncate">
                          {order.items.map((l) => itemName(l)).join(', ')}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                          <span className="flex items-center gap-1"><User size={11} />{order.user?.name || '—'}</span>
                          <span className="flex items-center gap-1"><Calendar size={11} />{new Date(order.createdAt).toLocaleDateString()}</span>
                          <span className="font-semibold text-text-primary">{fmt(order.total)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {flow && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, flow.nextStatus); }}
                            disabled={saving}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${flow.actionColor}`}
                          >
                            <flow.actionIcon size={13} />
                            {flow.actionLabel}
                          </button>
                        )}
                        <button
                          onClick={() => setDetail(order)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Eye size={13} />
                          Details
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function OrderDetail({
  order,
  onBack,
  onStatusUpdate,
  onCancel,
  saving,
}: {
  order: SellerOrder;
  onBack: () => void;
  onStatusUpdate: (orderId: string, status: string) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
  saving: boolean;
}) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const flow = FULFILLMENT_FLOW[order.status];
  const StatusIcon = cfg.icon;

  const statusSteps = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
  const currentStepIdx = statusSteps.indexOf(order.status);
  const isCancelled = ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status);

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    toast.success('Order number copied');
  };

  const addr = order.shippingAddress;

  return (
    <>
      <DashboardHeader title="Order Details" />
      <div className="p-6 space-y-5 max-w-5xl">
        {/* Back button */}
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
          <ChevronLeft size={16} />
          Back to Orders
        </button>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-text-primary">{order.orderNumber}</h2>
                <button onClick={copyOrderNumber} className="p-1 rounded hover:bg-gray-100 text-text-muted">
                  <Copy size={14} />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                <span>Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                {order.estimatedDelivery && (
                  <span className="flex items-center gap-1">
                    <Truck size={13} />
                    Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={cfg.variant} className="text-sm px-3 py-1">
                <StatusIcon size={13} className="mr-1" />
                {cfg.label}
              </Badge>
            </div>
          </div>

          {/* Progress tracker */}
          {!isCancelled && (
            <div className="mt-6 flex items-center gap-0">
              {statusSteps.map((step, i) => {
                const done = i <= currentStepIdx;
                const active = i === currentStepIdx;
                const StepIcon = STATUS_CONFIG[step]?.icon || Package;
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`flex items-center justify-center h-8 w-8 rounded-full border-2 transition-colors ${
                        done ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'
                      } ${active ? 'ring-2 ring-emerald-200' : ''}`}>
                        {done ? (
                          <CheckCircle size={16} className="text-emerald-600" />
                        ) : (
                          <StepIcon size={14} className="text-gray-400" />
                        )}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium ${done ? 'text-emerald-700' : 'text-text-muted'}`}>
                        {STATUS_CONFIG[step]?.label || step}
                      </span>
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={`h-0.5 flex-1 -mx-1 ${i < currentStepIdx ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isCancelled && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 ${cfg.bg} ${cfg.border} border`}>
              <StatusIcon size={16} className={cfg.color} />
              <span className={`text-sm font-medium ${cfg.color}`}>This order has been {order.status.toLowerCase()}</span>
            </div>
          )}
        </motion.div>

        {/* Action bar */}
        {flow && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/50 p-5"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Next Step</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {order.status === 'PENDING' && 'Review the order details and accept it to start processing.'}
                  {order.status === 'PROCESSING' && 'Confirm the order to begin packing and preparation.'}
                  {order.status === 'CONFIRMED' && 'Pack the items and mark as shipped with tracking details.'}
                  {order.status === 'SHIPPED' && 'Once delivered, mark the order as delivered to complete fulfillment.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!['DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status) && (
                  <button
                    onClick={() => onCancel(order.id)}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
                <button
                  onClick={() => onStatusUpdate(order.id, flow.nextStatus)}
                  disabled={saving}
                  className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg transition-colors ${flow.actionColor}`}
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <flow.actionIcon size={14} />
                  )}
                  {flow.actionLabel}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left: Items + Payment */}
          <div className="lg:col-span-2 space-y-5">
            {/* Order items */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-text-primary mb-4">
                Order Items ({order.items.length})
              </h3>
              <div className="space-y-3">
                {order.items.map((line, i) => {
                  const img = itemImg(line);
                  return (
                    <div key={i} className="flex gap-3 items-center rounded-xl border border-border p-3">
                      <div className="h-14 w-14 rounded-lg bg-gray-50 border border-border overflow-hidden shrink-0">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package size={18} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary text-sm truncate">{itemName(line)}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          Qty: {line.quantity} × {fmt(line.price)}
                        </p>
                      </div>
                      <p className="font-bold text-text-primary text-sm shrink-0">
                        {fmt(line.quantity * line.price)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Price breakdown */}
              <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span>{fmt(order.subtotal ?? order.items.reduce((s, l) => s + l.price * l.quantity, 0))}</span>
                </div>
                {(order.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-{fmt(order.discount!)}</span>
                  </div>
                )}
                {(order.shipping ?? 0) > 0 && (
                  <div className="flex justify-between text-text-muted">
                    <span>Shipping</span>
                    <span>{fmt(order.shipping!)}</span>
                  </div>
                )}
                {(order.tax ?? 0) > 0 && (
                  <div className="flex justify-between text-text-muted">
                    <span>Tax (GST)</span>
                    <span>{fmt(order.tax!)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-text-primary text-base pt-2 border-t border-border">
                  <span>Total</span>
                  <span>{fmt(order.total)}</span>
                </div>
              </div>
            </motion.div>

            {/* Payment info */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-text-primary mb-3">Payment Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-text-muted text-xs">Method</p>
                  <p className="font-medium text-text-primary capitalize">{order.paymentMethod?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">Status</p>
                  <Badge variant={order.paymentStatus === 'PAID' ? 'success' : order.paymentStatus === 'FAILED' ? 'danger' : 'warning'}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right sidebar: Customer + Address */}
          <div className="space-y-5">
            {/* Customer */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
                <User size={14} /> Customer
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-text-primary">{order.user?.name || '—'}</p>
                <p className="text-text-muted">{order.user?.email || '—'}</p>
                {order.user?.phone && (
                  <p className="flex items-center gap-1 text-text-muted">
                    <Phone size={12} />
                    {order.user.phone}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Shipping address */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
                <MapPin size={14} /> Shipping Address
              </h3>
              {addr ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-text-primary">{addr.fullName}</p>
                  <p className="text-text-secondary">{addr.addressLine1}</p>
                  {addr.addressLine2 && <p className="text-text-secondary">{addr.addressLine2}</p>}
                  <p className="text-text-secondary">{addr.city}, {addr.state} — {addr.pincode}</p>
                  <p className="flex items-center gap-1 text-text-muted mt-1.5">
                    <Phone size={12} />
                    {addr.phone}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-muted">No shipping address on file</p>
              )}
            </motion.div>

            {/* Order timeline placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-text-primary mb-3">Order Timeline</h3>
              <div className="space-y-3">
                <TimelineItem label="Order placed" time={order.createdAt} active />
                {['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                  <TimelineItem label="Order confirmed" time={order.createdAt} active />
                )}
                {['SHIPPED', 'DELIVERED'].includes(order.status) && (
                  <TimelineItem label="Shipped" time={order.createdAt} active />
                )}
                {order.status === 'DELIVERED' && (
                  <TimelineItem label="Delivered" time={order.estimatedDelivery || order.createdAt} active />
                )}
                {isCancelled && (
                  <TimelineItem label={`Order ${order.status.toLowerCase()}`} time={order.createdAt} danger />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}

function TimelineItem({ label, time, active, danger }: { label: string; time: string; active?: boolean; danger?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center">
        <div className={`h-2.5 w-2.5 rounded-full mt-1 ${danger ? 'bg-red-500' : active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        <div className="w-px h-4 bg-gray-200" />
      </div>
      <div>
        <p className={`text-xs font-medium ${danger ? 'text-red-600' : 'text-text-primary'}`}>{label}</p>
        <p className="text-[10px] text-text-muted">{new Date(time).toLocaleString()}</p>
      </div>
    </div>
  );
}
