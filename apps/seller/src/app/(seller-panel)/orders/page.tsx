'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Package, Truck, CheckCircle, XCircle, Clock, Search,
  ChevronDown, ArrowRight, MapPin, Phone, User, CreditCard,
  PackageX, ClipboardList, RefreshCw,
  Copy, Calendar, ShoppingBag, AlertTriangle, Loader2, ChevronLeft,
  ExternalLink, Download, Navigation, X, Weight, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Badge, Button, Input, Modal } from '@xelnova/ui';
import {
  apiGetOrders,
  apiGetSellerOrder,
  apiUpdateOrderStatus,
  apiGetShipment,
  apiTrackShipment,
  apiUpdateShipmentAwb,
  apiUpdateShipmentStatus,
  apiCancelShipment,
  apiSchedulePickup,
  apiDownloadShippingLabel,
  apiDownloadCustomerInvoice,
} from '@/lib/api';

interface OrderProduct {
  name: string;
  images?: string[];
  weight?: number | null;
  dimensions?: string | null;
  packageLengthCm?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  packageWeightKg?: number | null;
  xelnovaProductId?: string | null;
}

interface SellerOrderItem {
  product?: OrderProduct | null;
  productName?: string;
  productImage?: string | null;
  quantity: number;
  price: number;
  variant?: string | null;
  variantSku?: string | null;
  variantImage?: string | null;
  variantAttributes?: Record<string, string> | null;
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
  /** Expected pickup from seller (ISO), set for Xelnova / integrated bookings */
  pickupDate?: string | null;
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
  PICKED_UP: 'Shipped',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  RTO_INITIATED: 'RTO',
  RTO_DELIVERED: 'RTO Delivered',
  CANCELLED: 'Cancelled',
};

const FULFILLMENT_FLOW: Record<string, { nextStatus: string; actionLabel: string; actionIcon: typeof Package; actionColor: string }> = {
  PENDING:    { nextStatus: 'CONFIRMED',  actionLabel: 'Accept Order',    actionIcon: CheckCircle,  actionColor: 'bg-blue-600 hover:bg-blue-700' },
  PROCESSING: { nextStatus: 'CONFIRMED',  actionLabel: 'Confirm Order',   actionIcon: ClipboardList,actionColor: 'bg-blue-600 hover:bg-blue-700' },
};

const SELLER_SHIP_INTENT_KEY = 'xelnova_seller_ship_order_id';

function normalizeOrders(res: unknown): SellerOrder[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && 'items' in res && Array.isArray((res as { items: unknown }).items)) {
    return (res as { items: SellerOrder[] }).items;
  }
  return [];
}

function itemImg(line: SellerOrderItem): string | undefined {
  return line.variantImage || line.product?.images?.[0] || line.productImage || undefined;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SellerOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModal, setCancelModal] = useState<SellerOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);
  /** Tracks whether a `?orderNumber=` deep link has already been consumed
   *  so a re-render (or a follow-up `load()` after status change) doesn't
   *  reopen the modal. */
  const handledDeepLinkRef = useRef(false);

  /** Consumed once per `/orders/ship/[id]` → orders redirect so ship modal opens. */
  const handledShipIntentRef = useRef(false);
  const [autoOpenShipModal, setAutoOpenShipModal] = useState(false);

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

  /** Deep-link from the notification bell: `/orders?orderNumber=XN-...`
   *  finds the order in the loaded list and opens its detail view, then
   *  scrubs the query so reopening the page lands on the index again. */
  useEffect(() => {
    if (handledDeepLinkRef.current) return;
    if (loading || orders.length === 0) return;
    const target = searchParams.get('orderNumber');
    if (!target) return;
    const match = orders.find((o) => o.orderNumber === target);
    if (match) setDetail(match);
    else toast.error(`Order #${target} not found in your recent orders.`);
    handledDeepLinkRef.current = true;
    router.replace(pathname, { scroll: false });
  }, [loading, orders, searchParams, router, pathname]);

  useEffect(() => {
    if (loading) return;
    const id =
      typeof window !== 'undefined' ? sessionStorage.getItem(SELLER_SHIP_INTENT_KEY) : null;
    if (!id) return;

    let cancelled = false;
    void (async () => {
      try {
        let ord: SellerOrder | undefined = orders.find((o) => o.id === id);
        if (!ord) ord = (await apiGetSellerOrder(id)) as SellerOrder;
        if (cancelled) return;
        sessionStorage.removeItem(SELLER_SHIP_INTENT_KEY);
        handledShipIntentRef.current = true;
        setDetail(ord);
        setAutoOpenShipModal(true);
      } catch (e: unknown) {
        if (cancelled) return;
        sessionStorage.removeItem(SELLER_SHIP_INTENT_KEY);
        toast.error(e instanceof Error ? e.message : 'Could not open ship flow');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, orders]);

  useEffect(() => {
    if (loading) return;
    const id =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('xelnova_seller_view_order_id')
        : null;
    if (!id) return;
    sessionStorage.removeItem('xelnova_seller_view_order_id');
    const ord = orders.find((o) => o.id === id);
    if (ord) {
      setDetail(ord);
    } else {
      void (async () => {
        try {
          const fetched = (await apiGetSellerOrder(id)) as SellerOrder;
          setDetail(fetched);
        } catch {
          toast.error('Could not load order details');
        }
      })();
    }
  }, [loading, orders]);

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
      if (newStatus === 'CONFIRMED') {
        router.push(`/orders/ship/${orderId}`);
      }
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
          onBack={() => {
            handledShipIntentRef.current = false;
            setAutoOpenShipModal(false);
            setDetail(null);
          }}
          onStatusUpdate={handleStatusUpdate}
          onCancel={(orderId) => {
            const order = orders.find(o => o.id === orderId);
            if (order) openCancelModal(order);
          }}
          onShipped={handleShipped}
          onOrderRefresh={(updated) => {
            setDetail(updated);
            setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
          }}
          saving={saving}
          autoOpenShipModal={autoOpenShipModal}
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
      <div className="p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Action Required', tab: 'action_required' as TabFilter, count: counts.action_required, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Shipped', tab: 'shipped' as TabFilter, count: counts.shipped, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Delivered', tab: 'delivered' as TabFilter, count: counts.delivered, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Orders', tab: 'all' as TabFilter, count: counts.all, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((s) => (
            <motion.button
              key={s.label}
              type="button"
              onClick={() => setActiveTab(s.tab)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`rounded-xl border bg-white p-4 flex items-center gap-3 text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                activeTab === s.tab ? 'border-primary-400 ring-1 ring-primary-300' : 'border-border'
              }`}
              aria-label={`Filter by ${s.label}`}
            >
              <div className={`rounded-lg p-2 ${s.bg}`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{loading ? '—' : s.count}</p>
                <p className="text-xs text-text-muted">{s.label}</p>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border px-4 py-3">
            <div className="flex gap-1 overflow-x-auto min-w-0 pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
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
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative w-full min-w-0 sm:w-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-gray-50 text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:ring-1 focus:ring-primary-400/30 outline-none w-full sm:w-48"
                />
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg border border-border hover:bg-gray-50 text-text-muted hover:text-text-primary transition-colors shrink-0"
                aria-label="Refresh orders"
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
              <div className="py-16 text-center px-4">
                <Package size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-text-primary text-sm font-medium">No orders match this view</p>
                <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto">
                  {search
                    ? 'Try a different search or clear the filter.'
                    : activeTab === 'action_required'
                      ? 'You are all caught up — new orders will appear here.'
                      : 'Orders will show up here once customers place them.'}
                </p>
              </div>
            ) : (
              filtered.map((order) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                const isPaid = order.paymentStatus === 'PAID';
                // Per client testing observation #5: seller cannot manually flip
                // status to Confirmed; it must be auto-set when payment is received.
                // So the Accept/Confirm button is only shown when the order is paid
                // but somehow stuck in PENDING/PROCESSING (rare edge case).
                const flow = isPaid ? FULFILLMENT_FLOW[order.status] : null;
                const StatusIcon = cfg.icon;
                const shipmentExists = order.shipment && order.shipment.shipmentStatus !== 'CANCELLED';
                const showShipBtn = order.status === 'CONFIRMED' && isPaid && !shipmentExists;
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
                          <Image src={itemImg(order.items[0])!} alt="" fill sizes="64px" className="object-cover" />
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
                        {/* Pending-while-unpaid: explain why no action button. */}
                        {!isPaid && (order.status === 'PENDING' || order.status === 'PROCESSING') && (
                          <span
                            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md"
                            title="Order will auto-confirm once payment is received."
                          >
                            <Clock size={10} />
                            Awaiting payment
                          </span>
                        )}
                        {showShipBtn && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/orders/ship/${order.id}`);
                            }}
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
  onOrderRefresh,
  saving,
  autoOpenShipModal = false,
}: {
  order: SellerOrder;
  onBack: () => void;
  onStatusUpdate: (orderId: string, status: string) => Promise<void>;
  onCancel: (orderId: string) => void;
  onShipped: (orderId: string) => void;
  onOrderRefresh: (updated: SellerOrder) => void;
  saving: boolean;
  autoOpenShipModal?: boolean;
}) {
  const router = useRouter();
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

  // Schedule pickup (Xelgo / integrated couriers)
  const [pickupModal, setPickupModal] = useState(false);
  const [pickupSubmitting, setPickupSubmitting] = useState(false);
  const [pickupDate, setPickupDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [pickupTime, setPickupTime] = useState<string>('14:00');
  const [pickupPackages, setPickupPackages] = useState<number>(1);

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const isPaid = order.paymentStatus === 'PAID';
  // Per testing observation #5: seller-driven Accept/Confirm only when paid;
  // otherwise we show an "awaiting payment" hint instead.
  const flow = isPaid ? FULFILLMENT_FLOW[order.status] : null;
  const StatusIcon = cfg.icon;
  const statusSteps = ['PENDING', 'PROCESSING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;
  const currentStepIdx = statusSteps.indexOf(order.status as (typeof statusSteps)[number]);
  const isCancelled = ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status);
  const shipmentCancelled = shipment?.shipmentStatus === 'CANCELLED';
  // Align with the order list: ship only once the order is confirmed (not while
  // still in PROCESSING). Allow re-ship after a cancelled shipment.
  const showShipAction =
    isPaid &&
    !isCancelled &&
    (
      (order.status === 'CONFIRMED' && !shipment) ||
      (shipmentCancelled && !['DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status))
    );

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

  const refreshOrder = useCallback(async () => {
    try {
      const fresh = (await apiGetSellerOrder(order.id)) as SellerOrder;
      onOrderRefresh(fresh);
    } catch {
      // Silently ignore — order detail will stay with current data
    }
  }, [order.id, onOrderRefresh]);

  useEffect(() => {
    if (['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      loadShipment();
    }
  }, [order.id, order.status, loadShipment]);

  useEffect(() => {
    refreshOrder();
  }, [refreshOrder]);

  useEffect(() => {
    if (!autoOpenShipModal) return;
    if (!showShipAction) return;
    router.push(`/orders/ship/${order.id}`);
  }, [autoOpenShipModal, showShipAction, router, order.id]);

  const handleLiveTrack = async () => {
    setTrackingLoading(true);
    try {
      const data = await apiTrackShipment(order.id);
      setTrackingData(data);
      await refreshOrder();
      toast.success('Tracking data refreshed');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch tracking');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!confirm('Are you sure you want to cancel this shipment? You can re-ship with the correct option afterwards.')) return;
    try {
      await apiCancelShipment(order.id);
      toast.success('Shipment cancelled. You can now re-ship this order.');
      loadShipment();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel shipment');
    }
  };

  const handleSchedulePickup = async () => {
    if (!pickupDate) { toast.error('Pick a pickup date'); return; }
    setPickupSubmitting(true);
    try {
      const result = await apiSchedulePickup(order.id, {
        pickupDate,
        pickupTime: pickupTime ? `${pickupTime}:00` : undefined,
        expectedPackageCount: Math.max(1, pickupPackages || 1),
      });
      if (result?.success) {
        toast.success(result.message || 'Pickup scheduled');
        setPickupModal(false);
        loadShipment();
      } else {
        toast.error(result?.message || 'Failed to schedule pickup');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule pickup');
    } finally {
      setPickupSubmitting(false);
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

  const handleDownloadInvoice = async () => {
    setLabelDownloading(true);
    try {
      await apiDownloadCustomerInvoice(order.id);
      toast.success('Invoice downloaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download invoice');
    } finally {
      setLabelDownloading(false);
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
      <div className="p-4 sm:p-6 space-y-5 max-w-5xl">
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
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                <>
                  <button
                    onClick={handleDownloadLabel}
                    disabled={labelDownloading || !shipment || shipmentCancelled}
                    title={!shipment || shipmentCancelled ? 'Generate a shipment first to download the label' : undefined}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    {labelDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Shipping Label
                  </button>
                  <button
                    onClick={handleDownloadInvoice}
                    disabled={labelDownloading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {labelDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Download Invoice
                  </button>
                </>
              )}
              <Badge variant={cfg.variant} className="text-sm px-3 py-1">
                <StatusIcon size={13} className="mr-1" />
                {cfg.label}
              </Badge>
            </div>
          </div>

          {!isCancelled && currentStepIdx >= 0 && (
            <div className="mt-6 flex items-center gap-0 overflow-x-auto pb-1 -mx-1 px-1">
              {statusSteps.map((step, i) => {
                const done = i <= currentStepIdx;
                const active = i === currentStepIdx;
                const StepIcon = STATUS_CONFIG[step]?.icon || Package;
                return (
                  <div key={step} className="flex items-center flex-1 min-w-[3.5rem]">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`flex items-center justify-center h-8 w-8 rounded-full border-2 transition-colors ${done ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'} ${active ? 'ring-2 ring-emerald-200' : ''}`}>
                        {done ? <CheckCircle size={16} className="text-emerald-600" /> : <StepIcon size={14} className="text-gray-400" />}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium text-center max-w-[4.5rem] leading-tight ${done ? 'text-emerald-700' : 'text-text-muted'}`}>
                        {STATUS_CONFIG[step]?.label || step}
                      </span>
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={`h-0.5 flex-1 min-w-[2px] -mx-0.5 shrink ${i < currentStepIdx ? 'bg-emerald-400' : 'bg-gray-200'}`} />
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

        {/* Awaiting payment hint — replaces action buttons until customer pays */}
        {!isPaid && !isCancelled && (order.status === 'PENDING' || order.status === 'PROCESSING') && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-5"
          >
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-amber-900">Awaiting payment</h3>
                <p className="text-xs text-amber-800/80 mt-0.5 leading-relaxed">
                  This order will move to <span className="font-semibold">Confirmed</span> automatically once
                  the customer&apos;s payment is received. You don&apos;t need to confirm it manually, and the
                  &ldquo;Ship Now&rdquo; option will appear after that.
                </p>
              </div>
            </div>
          </motion.div>
        )}

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
                  Choose your shipping method — ship it yourself or use Xelgo (our platform courier).
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
                <Button onClick={() => router.push(`/orders/ship/${order.id}`)} className="gap-2">
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
        {shipment && !shipmentCancelled && (
          <ShipmentInfoPanel
            shipment={shipment}
            trackingData={trackingData}
            trackingLoading={trackingLoading}
            onLiveTrack={handleLiveTrack}
            onCancelShipment={handleCancelShipment}
            onSchedulePickup={() => setPickupModal(true)}
            onUpdateAwb={() => { setAwbNumber(shipment.awbNumber || ''); setAwbCarrier(shipment.courierProvider || ''); setAwbModal(true); }}
            onUpdateStatus={() => setSelfShipStatusModal(true)}
            onDownloadInvoice={handleDownloadInvoice}
            onDownloadLabel={handleDownloadLabel}
            labelDownloading={labelDownloading}
            copyText={copyText}
          />
        )}

        {/* Cancelled Shipment Notice */}
        {shipmentCancelled && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-red-200 bg-red-50/50 p-4"
          >
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-red-500" />
              <p className="text-sm font-medium text-red-800">
                Previous shipment was cancelled
              </p>
            </div>
            <p className="text-xs text-red-600/80 mt-1 ml-6">
              {shipment.courierProvider && <>Carrier: {shipment.courierProvider}</>}
              {shipment.awbNumber && <> &middot; AWB: {shipment.awbNumber}</>}
              {' '}&middot; You can re-ship this order using the correct option above.
            </p>
          </motion.div>
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
                        {img ? <Image src={img} alt="" fill sizes="56px" className="object-cover" /> : (
                          <div className="h-full w-full flex items-center justify-center"><Package size={18} className="text-gray-300" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary text-sm truncate">{itemName(line)}</p>
                        <p className="text-xs text-text-muted mt-0.5">Qty: {line.quantity} × {fmt(line.price)}</p>
                        {line.product?.xelnovaProductId ? (
                          <p className="text-[10px] font-mono text-text-muted mt-0.5">{line.product.xelnovaProductId}</p>
                        ) : null}
                        {line.variantSku || (line.variantAttributes && Object.keys(line.variantAttributes).length > 0) ? (
                          <div className="mt-1.5 space-y-0.5 text-[11px] text-text-secondary">
                            {line.variantAttributes &&
                              Object.entries(line.variantAttributes).map(([k, v]) => (
                                <p key={k}>
                                  <span className="text-text-muted">{k}:</span> {v}
                                </p>
                              ))}
                            {line.variantSku ? (
                              <p>
                                <span className="text-text-muted">SKU:</span>{' '}
                                <code className="font-mono text-[11px] bg-surface-muted px-1 rounded">{line.variantSku}</code>
                              </p>
                            ) : null}
                          </div>
                        ) : line.variant && line.variant !== '__default__' ? (
                          <p className="text-[11px] text-text-muted mt-1 capitalize">{line.variant.replace(/-/g, ' / ')}</p>
                        ) : null}
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

      {/* AWB Update Modal */}
      <Modal open={awbModal} onClose={() => setAwbModal(false)} title="Update AWB Number" size="md">
        <div className="space-y-4">
          <Input stackedLabel label="AWB Number *" value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)} placeholder="Enter AWB / tracking number" />
          <Input stackedLabel label="Carrier Name" value={awbCarrier} onChange={(e) => setAwbCarrier(e.target.value)} placeholder="e.g. BlueDart, DTDC" />
          <Input stackedLabel label="Tracking URL" value={awbTrackingUrl} onChange={(e) => setAwbTrackingUrl(e.target.value)} placeholder="https://..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAwbModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateAwb}>Update AWB</Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Pickup Modal — Xelgo / integrated couriers */}
      <Modal open={pickupModal} onClose={() => setPickupModal(false)} title="Schedule carrier pickup" size="md">
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Tell {shipment?.shippingMode === 'XELNOVA_COURIER' ? 'Xelgo' : (shipment?.courierProvider || 'the courier')} when to send a rider to your registered warehouse.
            You don&apos;t need to log in to the partner dashboard — we&apos;ll book it for you.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Pickup date *</label>
              <input
                type="date"
                value={pickupDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Pickup time (IST)</label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
              />
            </div>
          </div>
          <Input
            stackedLabel
            label="Number of packages"
            type="number"
            min={1}
            value={String(pickupPackages)}
            onChange={(e) => setPickupPackages(Math.max(1, Number(e.target.value) || 1))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPickupModal(false)} disabled={pickupSubmitting}>Cancel</Button>
            <Button onClick={handleSchedulePickup} disabled={pickupSubmitting}>
              {pickupSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
              {pickupSubmitting ? 'Scheduling…' : 'Schedule pickup'}
            </Button>
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
          <Input stackedLabel label="Location" value={selfShipLocation} onChange={(e) => setSelfShipLocation(e.target.value)} placeholder="e.g. Mumbai Hub" />
          <Input stackedLabel label="Remark" value={selfShipRemark} onChange={(e) => setSelfShipRemark(e.target.value)} placeholder="Optional note" />
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

function parseCarrierDisplay(courierProvider: string | null): { network: string; partner?: string } {
  if (!courierProvider?.trim()) return { network: '—' };
  const parts = courierProvider.split('·').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { network: parts[0], partner: parts.slice(1).join(' · ') };
  }
  return { network: courierProvider.trim() };
}

function formatPickup(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function ShipmentInfoPanel({
  shipment,
  trackingData,
  trackingLoading,
  onLiveTrack,
  onCancelShipment,
  onSchedulePickup,
  onUpdateAwb,
  onUpdateStatus,
  onDownloadInvoice,
  onDownloadLabel,
  labelDownloading,
  copyText,
}: {
  shipment: ShipmentData;
  trackingData: any;
  trackingLoading: boolean;
  onLiveTrack: () => void;
  onCancelShipment: () => void;
  onSchedulePickup: () => void;
  onUpdateAwb: () => void;
  onUpdateStatus: () => void;
  onDownloadInvoice: () => void;
  onDownloadLabel: () => void;
  labelDownloading: boolean;
  copyText: (text: string, label: string) => void;
}) {
  const isSelfShip = shipment.shippingMode === 'SELF_SHIP';
  const isXelnova = shipment.shippingMode === 'XELNOVA_COURIER';
  const canCancel = !['DELIVERED', 'RTO_DELIVERED', 'CANCELLED'].includes(shipment.shipmentStatus);
  const history = trackingData?.statusHistory || shipment.statusHistory || [];
  const carrier = parseCarrierDisplay(shipment.courierProvider);
  const pickupLabel = formatPickup(shipment.pickupDate ?? null);
  // Refresh tracking should also be available for self-ship orders that
  // do have a manually-entered AWB (testing observation #6).
  const canRefreshTracking = !isSelfShip || Boolean(shipment.awbNumber);
  // Carrier-side pickup booking is only meaningful for integrated couriers
  // (Xelgo / Delhivery / ShipRocket / etc.) that have an AWB and aren't
  // already past pickup. Self-ship goes out by the seller themselves.
  const pickupAlreadyDone = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO_INITIATED', 'RTO_DELIVERED', 'CANCELLED'].includes(shipment.shipmentStatus);
  const canSchedulePickup =
    shipment.shippingMode === 'XELNOVA_COURIER' &&
    !isSelfShip &&
    (Boolean(shipment.awbNumber) || Boolean(shipment.courierOrderId)) &&
    !pickupAlreadyDone;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
      className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Truck size={16} className="text-purple-600" />
          Shipment Details
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
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
          {canSchedulePickup && (
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              onClick={onSchedulePickup}
            >
              <Calendar size={12} /> Schedule Pickup
            </Button>
          )}
          {!isSelfShip && shipment.awbNumber && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
              onClick={onDownloadLabel}
              disabled={labelDownloading}
            >
              {labelDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              AWB / Label
            </Button>
          )}
          {canRefreshTracking && (
            <Button size="sm" variant="outline" onClick={onLiveTrack} disabled={trackingLoading}>
              {trackingLoading ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
              Refresh tracking
            </Button>
          )}
          {canCancel && (
            <button
              onClick={onCancelShipment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <X size={12} /> Cancel
            </button>
          )}
          {/* Customer invoice (replaces seller-side shipping-label PDF per
              testing observation #7). The actual delivery-partner shipping
              label remains available below as the "Courier label (partner)"
              link when one exists. */}
          <Button
            size="sm"
            variant="outline"
            className="border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100"
            onClick={onDownloadInvoice}
            disabled={labelDownloading}
          >
            {labelDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Invoice (customer copy)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-text-muted text-xs">Shipping mode</p>
          <p className="font-medium text-text-primary">
            {shipment.shippingMode === 'SELF_SHIP'
              ? 'Self Ship'
              : isXelnova
                ? 'Xelgo (integrated)'
                : shipment.shippingMode.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="md:col-span-1">
          <p className="text-text-muted text-xs">Carrier &amp; partner</p>
          <p className="font-medium text-text-primary leading-snug">{carrier.network}</p>
          {carrier.partner && (
            <p className="text-xs text-text-secondary mt-0.5">
              Last-mile: <span className="font-medium text-text-primary">{carrier.partner}</span>
            </p>
          )}
          {isXelnova && (
            <p className="text-[10px] text-text-muted mt-1 max-w-[220px]">
              Booked on Xelgo; delivery is completed by the partner shown above (configurable by admin).
            </p>
          )}
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

      {pickupLabel && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
          <p className="text-xs font-bold text-emerald-900 flex items-center gap-2">
            <Calendar size={14} />
            Pickup schedule
          </p>
          <p className="text-sm font-semibold text-emerald-950 mt-1">{pickupLabel} (IST)</p>
          <p className="text-[11px] text-emerald-800/90 mt-1">
            Keep the packed shipment ready before this time. The rider may contact you on your registered phone.
          </p>
        </div>
      )}

      {/* Cancel & Re-ship action */}
      {canCancel && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-red-800">Wrong shipping option?</p>
            <p className="text-[11px] text-red-600/80 mt-0.5">
              Cancel this shipment and choose a different method to re-ship this order.
            </p>
          </div>
          <button
            onClick={onCancelShipment}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors shadow-sm"
          >
            <X size={12} /> Cancel Shipment
          </button>
        </div>
      )}

      {/* Action links */}
      <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-border">
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
            <Download size={11} /> Courier label (partner)
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
