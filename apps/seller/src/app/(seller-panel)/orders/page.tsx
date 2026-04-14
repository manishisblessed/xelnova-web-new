'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Package, Truck, CheckCircle, XCircle, Clock, Search,
  ChevronDown, ArrowRight, MapPin, Phone, User, CreditCard,
  PackageCheck, PackageX, ClipboardList, Filter, RefreshCw,
  Copy, Calendar, ShoppingBag, AlertTriangle, Loader2, ChevronLeft,
  ExternalLink, Download, Navigation, X, Weight, Ruler, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Badge, Button, Input, Modal } from '@xelnova/ui';
import {
  apiGetOrders,
  apiUpdateOrderStatus,
  apiShipOrder,
  apiGetShipment,
  apiTrackShipment,
  apiUpdateShipmentAwb,
  apiUpdateShipmentStatus,
  apiCancelShipment,
  apiGetCourierConfigs,
  apiDownloadShippingLabel,
  apiGetShippingRates,
  type ShippingRates,
} from '@/lib/api';

interface OrderProduct {
  name: string;
  images?: string[];
  weight?: number | null;
  dimensions?: string | null;
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
  shipment?: ShipmentData | null;
}

interface ShipmentData {
  id: string;
  shippingMode: string;
  courierProvider: string | null;
  awbNumber: string | null;
  trackingUrl: string | null;
  shipmentStatus: string;
  courierOrderId: string | null;
  labelUrl: string | null;
  weight: number | null;
  dimensions: string | null;
  courierCharges: number | null;
  statusHistory: Array<{ status: string; timestamp: string; location?: string; remark?: string }>;
  createdAt: string;
  deliveredAt: string | null;
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

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  BOOKED: 'Booked',
  PICKUP_SCHEDULED: 'Pickup Scheduled',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  RTO_INITIATED: 'RTO Initiated',
  RTO_DELIVERED: 'RTO Delivered',
  CANCELLED: 'Cancelled',
};

const FULFILLMENT_FLOW: Record<string, { nextStatus: string; actionLabel: string; actionIcon: typeof Package; actionColor: string }> = {
  PENDING:    { nextStatus: 'CONFIRMED',  actionLabel: 'Accept Order',    actionIcon: CheckCircle,  actionColor: 'bg-blue-600 hover:bg-blue-700' },
  PROCESSING: { nextStatus: 'CONFIRMED',  actionLabel: 'Confirm Order',   actionIcon: ClipboardList,actionColor: 'bg-blue-600 hover:bg-blue-700' },
};

const COURIER_PROVIDERS = [
  { id: 'XELNOVA_COURIER', name: 'Xelnova Courier', desc: 'We handle everything', alwaysAvailable: true },
  { id: 'DELHIVERY', name: 'Delhivery', desc: 'Pan-India logistics' },
  { id: 'SHIPROCKET', name: 'ShipRocket', desc: 'Multi-courier aggregator' },
  { id: 'XPRESSBEES', name: 'XpressBees', desc: 'Fast delivery network' },
  { id: 'EKART', name: 'Ekart', desc: 'Flipkart logistics' },
];

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
  const [cancelModal, setCancelModal] = useState<SellerOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);

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

  const openCancelModal = (order: SellerOrder) => {
    setCancelModal(order);
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      const result = await apiUpdateOrderStatus(cancelModal.id, 'CANCELLED');
      const refundMsg = (result as any)?.refundMessage;
      if (refundMsg) {
        toast.success(refundMsg);
      } else {
        toast.success('Order cancelled successfully');
      }
      setOrders((prev) => prev.map((o) => (o.id === cancelModal.id ? { ...o, status: 'CANCELLED' } : o)));
      if (detail?.id === cancelModal.id) setDetail((d) => d ? { ...d, status: 'CANCELLED' } : d);
      setCancelModal(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleShipped = (orderId: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'SHIPPED' } : o)));
    if (detail?.id === orderId) setDetail((d) => d ? { ...d, status: 'SHIPPED' } : d);
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
    return (
      <>
        <OrderDetail
          order={detail}
          onBack={() => setDetail(null)}
          onStatusUpdate={handleStatusUpdate}
          onCancel={(orderId) => {
            const order = orders.find(o => o.id === orderId);
            if (order) openCancelModal(order);
          }}
          onShipped={handleShipped}
          saving={saving}
        />
        {cancelModal && (
          <CancelOrderModal
            order={cancelModal}
            onClose={() => setCancelModal(null)}
            onConfirm={handleCancel}
            cancelling={cancelling}
          />
        )}
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="Order Management" />
      <div className="p-6 space-y-5">
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

        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id ? 'text-primary-600' : 'text-text-muted hover:text-text-primary'
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
                const showShipBtn = order.status === 'CONFIRMED';
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative h-16 w-16 rounded-lg border border-border bg-gray-50 overflow-hidden shrink-0">
                        {order.items?.[0] && itemImg(order.items[0]) ? (
                          <Image src={itemImg(order.items[0])!} alt="" fill className="object-cover" />
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
                        {showShipBtn && (
                          <button
                            onClick={() => setDetail(order)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors"
                          >
                            <Truck size={13} />
                            Ship Now
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

// ─── Order Detail ───

function OrderDetail({
  order,
  onBack,
  onStatusUpdate,
  onCancel,
  onShipped,
  saving,
}: {
  order: SellerOrder;
  onBack: () => void;
  onStatusUpdate: (orderId: string, status: string) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
  onShipped: (orderId: string) => void;
  saving: boolean;
}) {
  const [shipModal, setShipModal] = useState(false);
  const [shipment, setShipment] = useState<ShipmentData | null>(
    (order.shipment as ShipmentData) || null,
  );
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [labelDownloading, setLabelDownloading] = useState(false);

  // Self-ship status update
  const [selfShipStatusModal, setSelfShipStatusModal] = useState(false);
  const [selfShipStatus, setSelfShipStatus] = useState('');
  const [selfShipLocation, setSelfShipLocation] = useState('');
  const [selfShipRemark, setSelfShipRemark] = useState('');

  // Self-ship AWB update
  const [awbModal, setAwbModal] = useState(false);
  const [awbNumber, setAwbNumber] = useState('');
  const [awbCarrier, setAwbCarrier] = useState('');
  const [awbTrackingUrl, setAwbTrackingUrl] = useState('');

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const flow = FULFILLMENT_FLOW[order.status];
  const StatusIcon = cfg.icon;
  const statusSteps = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
  const currentStepIdx = statusSteps.indexOf(order.status);
  const isCancelled = ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status);
  const showShipAction = order.status === 'CONFIRMED';

  const loadShipment = useCallback(async () => {
    setShipmentLoading(true);
    try {
      const data = await apiGetShipment(order.id);
      setShipment(data as ShipmentData);
    } catch {
      // No shipment yet
    } finally {
      setShipmentLoading(false);
    }
  }, [order.id]);

  useEffect(() => {
    if (['SHIPPED', 'DELIVERED'].includes(order.status) && !shipment) {
      loadShipment();
    }
  }, [order.status, loadShipment, shipment]);

  const handleLiveTrack = async () => {
    setTrackingLoading(true);
    try {
      const data = await apiTrackShipment(order.id);
      setTrackingData(data);
      toast.success('Tracking data refreshed');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch tracking');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!confirm('Are you sure you want to cancel this shipment?')) return;
    try {
      await apiCancelShipment(order.id);
      toast.success('Shipment cancellation requested');
      loadShipment();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel shipment');
    }
  };

  const handleUpdateAwb = async () => {
    if (!awbNumber.trim()) { toast.error('AWB number is required'); return; }
    try {
      await apiUpdateShipmentAwb(order.id, {
        awbNumber: awbNumber.trim(),
        carrierName: awbCarrier.trim() || undefined,
        trackingUrl: awbTrackingUrl.trim() || undefined,
      });
      toast.success('AWB updated');
      setAwbModal(false);
      loadShipment();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update AWB');
    }
  };

  const handleUpdateSelfShipStatus = async () => {
    if (!selfShipStatus) { toast.error('Select a status'); return; }
    try {
      await apiUpdateShipmentStatus(order.id, {
        status: selfShipStatus,
        location: selfShipLocation.trim() || undefined,
        remark: selfShipRemark.trim() || undefined,
      });
      toast.success('Shipment status updated');
      setSelfShipStatusModal(false);
      loadShipment();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDownloadLabel = async () => {
    setLabelDownloading(true);
    try {
      await apiDownloadShippingLabel(order.id);
      toast.success('Shipping label downloaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download label');
    } finally {
      setLabelDownloading(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const addr = order.shippingAddress;

  return (
    <>
      <DashboardHeader title="Order Details" />
      <div className="p-6 space-y-5 max-w-5xl">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
          <ChevronLeft size={16} />
          Back to Orders
        </button>

        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-text-primary">{order.orderNumber}</h2>
                <button onClick={() => copyText(order.orderNumber, 'Order number')} className="p-1 rounded hover:bg-gray-100 text-text-muted">
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
              {['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                <button
                  onClick={handleDownloadLabel}
                  disabled={labelDownloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  {labelDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  {labelDownloading ? 'Generating…' : 'Shipping Label'}
                </button>
              )}
              <Badge variant={cfg.variant} className="text-sm px-3 py-1">
                <StatusIcon size={13} className="mr-1" />
                {cfg.label}
              </Badge>
            </div>
          </div>

          {!isCancelled && (
            <div className="mt-6 flex items-center gap-0">
              {statusSteps.map((step, i) => {
                const done = i <= currentStepIdx;
                const active = i === currentStepIdx;
                const StepIcon = STATUS_CONFIG[step]?.icon || Package;
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`flex items-center justify-center h-8 w-8 rounded-full border-2 transition-colors ${done ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'} ${active ? 'ring-2 ring-emerald-200' : ''}`}>
                        {done ? <CheckCircle size={16} className="text-emerald-600" /> : <StepIcon size={14} className="text-gray-400" />}
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

        {/* Ship Order Action */}
        {showShipAction && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 p-5"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Truck size={16} className="text-purple-600" />
                  Ship This Order
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Choose your shipping method — ship it yourself or use a courier partner via Xelnova.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isCancelled && !['DELIVERED'].includes(order.status) && (
                  <button onClick={() => onCancel(order.id)} disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
                <Button onClick={() => setShipModal(true)} className="gap-2">
                  <Truck size={14} />
                  Ship Now
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Accept/Confirm action for PENDING/PROCESSING */}
        {flow && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/50 p-5"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Next Step</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {order.status === 'PENDING' && 'Review the order details and accept it to start processing.'}
                  {order.status === 'PROCESSING' && 'Confirm the order to begin packing and preparation.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isCancelled && !['DELIVERED'].includes(order.status) && (
                  <button onClick={() => onCancel(order.id)} disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
                <button onClick={() => onStatusUpdate(order.id, flow.nextStatus)} disabled={saving}
                  className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg transition-colors ${flow.actionColor}`}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <flow.actionIcon size={14} />}
                  {flow.actionLabel}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Shipment Info Panel */}
        {shipment && (
          <ShipmentInfoPanel
            shipment={shipment}
            trackingData={trackingData}
            trackingLoading={trackingLoading}
            onLiveTrack={handleLiveTrack}
            onCancelShipment={handleCancelShipment}
            onUpdateAwb={() => { setAwbNumber(shipment.awbNumber || ''); setAwbCarrier(shipment.courierProvider || ''); setAwbModal(true); }}
            onUpdateStatus={() => setSelfShipStatusModal(true)}
            copyText={copyText}
          />
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            {/* Order items */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-text-primary mb-4">Order Items ({order.items.length})</h3>
              <div className="space-y-3">
                {order.items.map((line, i) => {
                  const img = itemImg(line);
                  return (
                    <div key={i} className="flex gap-3 items-center rounded-xl border border-border p-3">
                      <div className="h-14 w-14 rounded-lg bg-gray-50 border border-border overflow-hidden shrink-0 relative">
                        {img ? <Image src={img} alt="" fill className="object-cover" /> : (
                          <div className="h-full w-full flex items-center justify-center"><Package size={18} className="text-gray-300" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary text-sm truncate">{itemName(line)}</p>
                        <p className="text-xs text-text-muted mt-0.5">Qty: {line.quantity} × {fmt(line.price)}</p>
                      </div>
                      <p className="font-bold text-text-primary text-sm shrink-0">{fmt(line.quantity * line.price)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span>{fmt(order.subtotal ?? order.items.reduce((s, l) => s + l.price * l.quantity, 0))}</span>
                </div>
                {(order.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{fmt(order.discount!)}</span></div>
                )}
                {(order.shipping ?? 0) > 0 && (
                  <div className="flex justify-between text-text-muted"><span>Shipping</span><span>{fmt(order.shipping!)}</span></div>
                )}
                {(order.tax ?? 0) > 0 && (
                  <div className="flex justify-between text-text-muted"><span>Tax (GST)</span><span>{fmt(order.tax!)}</span></div>
                )}
                <div className="flex justify-between font-bold text-text-primary text-base pt-2 border-t border-border">
                  <span>Total</span><span>{fmt(order.total)}</span>
                </div>
              </div>
            </motion.div>

            {/* Payment info */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
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

          <div className="space-y-5">
            {/* Customer */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5"><User size={14} /> Customer</h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-text-primary">{order.user?.name || '—'}</p>
                <p className="text-text-muted">{order.user?.email || '—'}</p>
                {order.user?.phone && (
                  <p className="flex items-center gap-1 text-text-muted"><Phone size={12} />{order.user.phone}</p>
                )}
              </div>
            </motion.div>

            {/* Shipping address */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5"><MapPin size={14} /> Shipping Address</h3>
              {addr ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-text-primary">{addr.fullName}</p>
                  <p className="text-text-secondary">{addr.addressLine1}</p>
                  {addr.addressLine2 && <p className="text-text-secondary">{addr.addressLine2}</p>}
                  <p className="text-text-secondary">{addr.city}, {addr.state} — {addr.pincode}</p>
                  <p className="flex items-center gap-1 text-text-muted mt-1.5"><Phone size={12} />{addr.phone}</p>
                </div>
              ) : (
                <p className="text-sm text-text-muted">No shipping address on file</p>
              )}
            </motion.div>

            {/* Order timeline */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <h3 className="text-sm font-bold text-text-primary mb-3">Order Timeline</h3>
              <div className="space-y-3">
                <TimelineItem label="Order placed" time={order.createdAt} active />
                {['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                  <TimelineItem label="Order confirmed" time={order.createdAt} active />
                )}
                {['SHIPPED', 'DELIVERED'].includes(order.status) && (
                  <TimelineItem label="Shipped" time={shipment?.createdAt || order.createdAt} active />
                )}
                {order.status === 'DELIVERED' && (
                  <TimelineItem label="Delivered" time={shipment?.deliveredAt || order.estimatedDelivery || order.createdAt} active />
                )}
                {isCancelled && (
                  <TimelineItem label={`Order ${order.status.toLowerCase()}`} time={order.createdAt} danger />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Ship Order Modal */}
      <ShipOrderModal
        open={shipModal}
        onClose={() => setShipModal(false)}
        orderId={order.id}
        orderItems={order.items}
        onSuccess={() => {
          setShipModal(false);
          onShipped(order.id);
          loadShipment();
          toast.success('Order shipped successfully!');
        }}
      />

      {/* AWB Update Modal */}
      <Modal open={awbModal} onClose={() => setAwbModal(false)} title="Update AWB Number" size="md">
        <div className="space-y-4">
          <Input label="AWB Number *" value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)} placeholder="Enter AWB / tracking number" />
          <Input label="Carrier Name" value={awbCarrier} onChange={(e) => setAwbCarrier(e.target.value)} placeholder="e.g. BlueDart, DTDC" />
          <Input label="Tracking URL" value={awbTrackingUrl} onChange={(e) => setAwbTrackingUrl(e.target.value)} placeholder="https://..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAwbModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateAwb}>Update AWB</Button>
          </div>
        </div>
      </Modal>

      {/* Self-Ship Status Update Modal */}
      <Modal open={selfShipStatusModal} onClose={() => setSelfShipStatusModal(false)} title="Update Shipment Status" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Status *</label>
            <select
              value={selfShipStatus}
              onChange={(e) => setSelfShipStatus(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            >
              <option value="">Select status...</option>
              {Object.entries(SHIPMENT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <Input label="Location" value={selfShipLocation} onChange={(e) => setSelfShipLocation(e.target.value)} placeholder="e.g. Mumbai Hub" />
          <Input label="Remark" value={selfShipRemark} onChange={(e) => setSelfShipRemark(e.target.value)} placeholder="Optional note" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelfShipStatusModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateSelfShipStatus}>Update Status</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Shipment Info Panel ───

function ShipmentInfoPanel({
  shipment,
  trackingData,
  trackingLoading,
  onLiveTrack,
  onCancelShipment,
  onUpdateAwb,
  onUpdateStatus,
  copyText,
}: {
  shipment: ShipmentData;
  trackingData: any;
  trackingLoading: boolean;
  onLiveTrack: () => void;
  onCancelShipment: () => void;
  onUpdateAwb: () => void;
  onUpdateStatus: () => void;
  copyText: (text: string, label: string) => void;
}) {
  const isSelfShip = shipment.shippingMode === 'SELF_SHIP';
  const canCancel = !['DELIVERED', 'RTO_DELIVERED', 'CANCELLED'].includes(shipment.shipmentStatus);
  const history = trackingData?.statusHistory || shipment.statusHistory || [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
      className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Truck size={16} className="text-purple-600" />
          Shipment Details
        </h3>
        <div className="flex items-center gap-2">
          {isSelfShip && (
            <>
              <Button size="sm" variant="outline" onClick={onUpdateAwb}>
                <Hash size={12} /> Update AWB
              </Button>
              <Button size="sm" variant="outline" onClick={onUpdateStatus}>
                Update Status
              </Button>
            </>
          )}
          {!isSelfShip && shipment.shippingMode !== 'XELNOVA_COURIER' && (
            <Button size="sm" variant="outline" onClick={onLiveTrack} disabled={trackingLoading}>
              {trackingLoading ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
              Live Track
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="danger" onClick={onCancelShipment}>
              <X size={12} /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-text-muted text-xs">Shipping Mode</p>
          <p className="font-medium text-text-primary">
            {shipment.shippingMode === 'SELF_SHIP' ? 'Self Ship' : shipment.courierProvider || shipment.shippingMode}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Status</p>
          <Badge variant={shipment.shipmentStatus === 'DELIVERED' ? 'success' : shipment.shipmentStatus === 'CANCELLED' ? 'danger' : 'info'}>
            {SHIPMENT_STATUS_LABELS[shipment.shipmentStatus] || shipment.shipmentStatus}
          </Badge>
        </div>
        {shipment.awbNumber && (
          <div>
            <p className="text-text-muted text-xs">AWB Number</p>
            <div className="flex items-center gap-1">
              <p className="font-mono font-medium text-text-primary">{shipment.awbNumber}</p>
              <button onClick={() => copyText(shipment.awbNumber!, 'AWB')} className="p-0.5 rounded hover:bg-gray-100 text-text-muted">
                <Copy size={11} />
              </button>
            </div>
          </div>
        )}
        {shipment.courierCharges != null && (
          <div>
            <p className="text-text-muted text-xs">Courier Charges</p>
            <p className="font-medium text-text-primary">{fmt(shipment.courierCharges)}</p>
          </div>
        )}
        {shipment.weight && (
          <div>
            <p className="text-text-muted text-xs">Weight</p>
            <p className="font-medium text-text-primary">{shipment.weight} kg</p>
          </div>
        )}
        {shipment.dimensions && (
          <div>
            <p className="text-text-muted text-xs">Dimensions</p>
            <p className="font-medium text-text-primary">{shipment.dimensions} cm</p>
          </div>
        )}
      </div>

      {/* Action links */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
        {shipment.trackingUrl && (
          <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
          >
            <ExternalLink size={11} /> Track on courier site
          </a>
        )}
        {shipment.labelUrl && (
          <a href={shipment.labelUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
          >
            <Download size={11} /> Download Label
          </a>
        )}
      </div>

      {/* Tracking Timeline */}
      {history.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <h4 className="text-xs font-bold text-text-primary mb-3">Tracking History</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...history].reverse().map((entry: any, i: number) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex flex-col items-center">
                  <div className={`h-2 w-2 rounded-full mt-1.5 ${i === 0 ? 'bg-purple-500' : 'bg-gray-300'}`} />
                  {i < history.length - 1 && <div className="w-px h-4 bg-gray-200" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-medium ${i === 0 ? 'text-purple-700' : 'text-text-primary'}`}>
                      {SHIPMENT_STATUS_LABELS[entry.status] || entry.status}
                    </p>
                    {entry.location && (
                      <span className="text-[10px] text-text-muted">{entry.location}</span>
                    )}
                  </div>
                  {entry.remark && <p className="text-[10px] text-text-muted">{entry.remark}</p>}
                  <p className="text-[10px] text-text-muted">{new Date(entry.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Ship Order Modal ───

interface CourierConfig {
  provider: string;
  isActive: boolean;
}

function ShipOrderModal({
  open,
  onClose,
  orderId,
  orderItems,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderItems?: SellerOrderItem[];
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'loading' | 'select' | 'details' | 'selfship' | 'result'>('loading');
  const [selectedCourier, setSelectedCourier] = useState<string>('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [shippingRates, setShippingRates] = useState<ShippingRates | null>(null);

  const getDefaultShippingInfo = useCallback(() => {
    if (!orderItems?.length) return { weight: '', dimensions: '' };
    
    let totalWeight = 0;
    let hasDimensions = false;
    let maxDimensions = '';
    
    for (const item of orderItems) {
      const productWeight = item.product?.weight;
      if (productWeight && productWeight > 0) {
        totalWeight += productWeight * item.quantity;
      }
      const productDimensions = item.product?.dimensions;
      if (productDimensions && !hasDimensions) {
        maxDimensions = productDimensions;
        hasDimensions = true;
      }
    }
    
    return {
      weight: totalWeight > 0 ? totalWeight.toFixed(2) : '',
      dimensions: maxDimensions,
    };
  }, [orderItems]);

  const loadConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    try {
      const [configs, rates] = await Promise.allSettled([
        apiGetCourierConfigs(),
        apiGetShippingRates(),
      ]);
      const providers = configs.status === 'fulfilled' && Array.isArray(configs.value)
        ? (configs.value as CourierConfig[]).filter((c) => c.isActive).map((c) => c.provider)
        : [];
      setConfiguredProviders(providers);
      if (rates.status === 'fulfilled') setShippingRates(rates.value);
      return providers;
    } catch {
      setConfiguredProviders([]);
      return [];
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep('loading');
      setSelectedCourier('');
      const defaults = getDefaultShippingInfo();
      setWeight(defaults.weight);
      setDimensions(defaults.dimensions);
      setAwbNumber('');
      setCarrierName('');
      setResult(null);
      
      loadConfigs().then((providers) => {
        if (providers.length > 0) {
          setSelectedCourier(providers[0]);
          setStep('details');
        } else {
          setStep('select');
        }
      });
    }
  }, [open, getDefaultShippingInfo, loadConfigs]);

  const estimatedShipping = (() => {
    if (!shippingRates) return null;
    const w = parseFloat(weight);
    const parts = dimensions.split(/[x×X,\s]+/).map(Number);
    const vol = parts.length === 3 && parts.every(n => n > 0) ? parts[0] * parts[1] * parts[2] : 0;

    let weightCharge = 0;
    if (w > 0) {
      const slab = shippingRates.weightSlabs.find(s => w <= s.upToKg);
      weightCharge = slab ? slab.rate : (shippingRates.weightSlabs[shippingRates.weightSlabs.length - 1]?.rate ?? 0);
    }

    let dimSurcharge = 0;
    if (vol > 0) {
      const slab = shippingRates.dimensionSlabs.find(s => vol <= s.upToCm3);
      dimSurcharge = slab ? slab.rate : (shippingRates.dimensionSlabs[shippingRates.dimensionSlabs.length - 1]?.rate ?? 0);
    }

    if (weightCharge === 0 && dimSurcharge === 0) return null;
    return { total: weightCharge + dimSurcharge, weightCharge, dimSurcharge };
  })();

  const handleSelectCourier = (courier: string) => {
    if (courier === 'SELF_SHIP') {
      setStep('selfship');
    } else {
      setSelectedCourier(courier);
      setStep('details');
    }
  };

  const handleShip = async () => {
    setSaving(true);
    try {
      const body: any = {
        shippingMode: step === 'selfship' ? 'SELF_SHIP' : selectedCourier,
      };
      if (step === 'selfship') {
        body.carrierName = carrierName.trim() || undefined;
        body.awbNumber = awbNumber.trim() || undefined;
      } else {
        body.weight = weight ? parseFloat(weight) : undefined;
        body.dimensions = dimensions.trim() || undefined;
      }

      const res = await apiShipOrder(orderId, body);
      setResult(res);
      setStep('result');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to ship order');
    } finally {
      setSaving(false);
    }
  };

  const availableCouriers = COURIER_PROVIDERS.filter(
    (cp) => cp.alwaysAvailable || configuredProviders.includes(cp.id)
  );

  const getProviderName = (id: string) => COURIER_PROVIDERS.find((c) => c.id === id)?.name || id;

  return (
    <Modal open={open} onClose={onClose} title="Ship Order" size="lg">
      <AnimatePresence mode="wait">
        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <p className="text-sm text-text-muted">Loading your courier partners...</p>
          </motion.div>
        )}

        {step === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-700">
                <strong>No courier partners connected.</strong> Connect your Delhivery, ShipRocket, XpressBees, or Ekart account in{' '}
                <a href="/shipping" className="underline font-medium">Shipping Settings</a> for automated shipping with AWB generation.
              </p>
            </div>
            <p className="text-sm text-text-muted">Select a shipping method:</p>
            {loadingConfigs ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-500" /></div>
            ) : (
              <div className="grid gap-3">
                <button onClick={() => handleSelectCourier('XELNOVA_COURIER')}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-primary-200 bg-primary-50/30 hover:border-primary-400 transition-all text-left"
                >
                  <div className="rounded-lg bg-primary-100 p-2.5"><Truck size={20} className="text-primary-600" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-text-primary">Xelnova Courier</h4>
                      <Badge variant="success">Always Available</Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">We handle pickup, delivery, AWB & tracking. No setup needed.</p>
                  </div>
                  <ArrowRight size={14} className="text-text-muted mt-3" />
                </button>
                <button onClick={() => handleSelectCourier('SELF_SHIP')}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-gray-300 hover:bg-gray-50/50 transition-all text-left"
                >
                  <div className="rounded-lg bg-gray-100 p-2.5"><Package size={20} className="text-gray-600" /></div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-text-primary">Ship By Own</h4>
                    <p className="text-xs text-text-muted mt-0.5">Ship using your own courier. Enter AWB and update status manually.</p>
                  </div>
                  <ArrowRight size={14} className="text-text-muted mt-3" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {step === 'details' && (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {availableCouriers.length > 1 && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-muted">Ship via</label>
                <div className="flex flex-wrap gap-2">
                  {availableCouriers.map((cp) => (
                    <button
                      key={cp.id}
                      onClick={() => setSelectedCourier(cp.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        selectedCourier === cp.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-border bg-white text-text-secondary hover:border-gray-300'
                      }`}
                    >
                      {cp.name}
                      {configuredProviders.includes(cp.id) && (
                        <CheckCircle size={10} className="inline ml-1 text-emerald-500" />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => setStep('selfship')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white text-text-secondary hover:border-gray-300 transition-all"
                  >
                    Ship By Own
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <p className="text-xs text-emerald-700 font-medium">
                  Shipping via {getProviderName(selectedCourier)}
                </p>
              </div>
              <p className="text-xs text-emerald-600/80 mt-1">
                {selectedCourier === 'XELNOVA_COURIER'
                  ? 'Xelnova will handle pickup, delivery, and all status updates automatically.'
                  : 'Shipment will be booked automatically. AWB number and tracking will be generated instantly.'}
              </p>
            </div>

            <Input
              label="Package Weight (kg)"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 0.5"
              icon={<Weight size={14} />}
            />
            <Input
              label="Dimensions (LxBxH in cm)"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder="e.g. 30x20x15"
              icon={<Ruler size={14} />}
            />
            {estimatedShipping && (
              <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-3 space-y-1">
                <p className="text-sm font-semibold text-primary-700">
                  Est. shipping: ₹{estimatedShipping.total}
                </p>
                <p className="text-[11px] text-primary-600/80">
                  Weight: ₹{estimatedShipping.weightCharge}
                  {estimatedShipping.dimSurcharge > 0 && ` + Dimension surcharge: ₹${estimatedShipping.dimSurcharge}`}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleShip} loading={saving}>
                <Truck size={14} />
                Book Shipment
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'selfship' && (
          <motion.div key="selfship" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => configuredProviders.length > 0 ? setStep('details') : setStep('select')} className="p-1 rounded hover:bg-gray-100 text-text-muted"><ChevronLeft size={16} /></button>
              <p className="text-sm text-text-muted">Ship By Own</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-700">
                You&apos;ll ship this order yourself. Enter the AWB number now or add it later from the order details.
              </p>
            </div>
            <Input
              label="Carrier Name"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              placeholder="e.g. BlueDart, DTDC, India Post"
            />
            <Input
              label="AWB / Tracking Number"
              value={awbNumber}
              onChange={(e) => setAwbNumber(e.target.value)}
              placeholder="Enter AWB number (optional, can add later)"
              icon={<Hash size={14} />}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleShip} loading={saving}>
                <PackageCheck size={14} />
                Confirm Self-Ship
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'result' && result && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-emerald-100 p-3">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-text-primary">Shipment Created!</h3>
            {result.awbNumber && (
              <div className="rounded-xl bg-gray-50 border border-border p-4">
                <p className="text-xs text-text-muted mb-1">AWB Number</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-lg font-mono font-bold text-text-primary">{result.awbNumber}</p>
                  <button onClick={() => { navigator.clipboard.writeText(result.awbNumber); toast.success('AWB copied'); }}
                    className="p-1 rounded hover:bg-gray-200 text-text-muted"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
            {result.courierProvider && (
              <p className="text-sm text-text-secondary">
                Shipped via <strong>{result.courierProvider}</strong>
              </p>
            )}
            {result.trackingUrl ? (
              <a href={result.trackingUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
              >
                <ExternalLink size={13} /> Track Shipment
              </a>
            ) : (
              <p className="text-xs text-text-muted">
                You can track this shipment from the order details page.
              </p>
            )}
            <Button onClick={onSuccess} fullWidth>Done</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

// ─── Timeline Item ───

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

// ─── Cancel Order Modal ───

function CancelOrderModal({
  order,
  onClose,
  onConfirm,
  cancelling,
}: {
  order: SellerOrder;
  onClose: () => void;
  onConfirm: () => void;
  cancelling: boolean;
}) {
  const isPaid = order.paymentStatus === 'PAID';
  const isOnlinePayment = order.paymentMethod && order.paymentMethod !== 'COD';
  const refundAmount = Number(order.total) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-50">
            <XCircle size={24} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">Cancel Order</h3>
            <p className="text-sm text-text-secondary">Order #{order.orderNumber}</p>
          </div>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Important</p>
              <p className="text-xs text-amber-700 mt-1">
                Cancelling this order will notify the customer and process a refund if payment was made.
              </p>
            </div>
          </div>
        </div>

        {isPaid && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-800">Refund Information</p>
            <div className="space-y-1.5 text-xs text-blue-700">
              <div className="flex justify-between">
                <span>Refund Amount:</span>
                <span className="font-bold">₹{refundAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium">{order.paymentMethod || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Refund Destination:</span>
                <span className="font-medium">
                  {isOnlinePayment ? 'Original Payment Source' : 'Customer Wallet'}
                </span>
              </div>
              {isOnlinePayment && (
                <p className="text-[10px] text-blue-600 pt-1">
                  Refund will be processed via Razorpay and credited to customer&apos;s bank/card/UPI within 5-7 business days.
                </p>
              )}
            </div>
          </div>
        )}

        {!isPaid && order.paymentStatus !== 'PENDING' && (
          <p className="text-sm text-text-secondary">
            No refund needed — payment status is <strong>{order.paymentStatus}</strong>.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Keep Order
          </button>
          <button
            onClick={onConfirm}
            disabled={cancelling}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {cancelling ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Processing...
              </>
            ) : (
              <>Cancel & Refund</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
