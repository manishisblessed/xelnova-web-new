'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Truck, CheckCircle, ArrowRight, Calendar, Loader2, ChevronLeft,
  ExternalLink, Download, Navigation, Weight, Ruler, PackageCheck, Phone, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Badge, Button, Input } from '@xelnova/ui';
import {
  apiGetSellerOrder,
  apiShipOrder,
  apiGetCourierConfigs,
  apiDownloadShippingLabel,
  apiDownloadCustomerInvoice,
  apiGetShippingRates,
  apiCheckServiceability,
  apiUpdateProfile,
  apiListPickupLocations,
  type ShippingRates,
  type SellerPickupLocation,
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
  status: string;
  paymentStatus: string;
  createdAt: string;
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

interface CourierConfig {
  provider: string;
  isActive: boolean;
}

interface ServiceabilityRate {
  provider: string;
  providerKey: string;
  service: string;
  cost: number | null;
  estimatedDays: number | null;
  estimatedDelivery: string | null;
  serviceable: boolean;
  carrierBackend?: string;
}

const COURIER_PROVIDERS = [
  { id: 'XELNOVA_COURIER', name: 'Xelgo', desc: 'Our platform courier — we handle pickup, delivery & tracking', alwaysAvailable: true },
  { id: 'DELHIVERY', name: 'Delhivery', desc: 'Pan-India logistics' },
  { id: 'SHIPROCKET', name: 'ShipRocket', desc: 'Multi-courier aggregator' },
  { id: 'XPRESSBEES', name: 'XpressBees', desc: 'Fast delivery network' },
  { id: 'EKART', name: 'Ekart', desc: 'Flipkart logistics' },
];

function composePackageDimsString(
  l?: number | null,
  w?: number | null,
  h?: number | null,
): string {
  if (l == null && w == null && h == null) return '';
  const a = Number(l) || 0;
  const b = Number(w) || 0;
  const c = Number(h) || 0;
  if (a <= 0 && b <= 0 && c <= 0) return '';
  return `${a}x${b}x${c}`;
}

export default function SellerShipOrderPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<SellerOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [step, setStep] = useState<'loading' | 'rates' | 'pickup' | 'add-phone' | 'result'>('loading');
  const [selectedCourier, setSelectedCourier] = useState<string>('');
  const [selectedRate, setSelectedRate] = useState<ServiceabilityRate | null>(null);
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [shippingRates, setShippingRates] = useState<ShippingRates | null>(null);
  const [serviceabilityRates, setServiceabilityRates] = useState<ServiceabilityRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);

  const [shipPickupDate, setShipPickupDate] = useState<string>('');
  const [shipPickupTime, setShipPickupTime] = useState<string>('');
  const [shipPickupPackages, setShipPickupPackages] = useState<number>(1);
  const [skipPickupAtBooking, setSkipPickupAtBooking] = useState(false);

  const [pickupLocations, setPickupLocations] = useState<SellerPickupLocation[]>([]);
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState<string>('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneReturnStep, setPhoneReturnStep] = useState<'rates' | 'pickup'>('pickup');
  const savingLock = useRef(false);

  const getDefaultShippingInfo = useCallback(() => {
    if (!order?.items?.length) return { weight: '', dimensions: '' };
    let totalWeight = 0;
    let hasDimensions = false;
    let maxDimensions = '';
    for (const item of order.items) {
      const pkgWt = item.product?.packageWeightKg ?? item.product?.weight;
      if (pkgWt && pkgWt > 0) {
        totalWeight += pkgWt * item.quantity;
      }
      const dimStr =
        composePackageDimsString(
          item.product?.packageLengthCm,
          item.product?.packageWidthCm,
          item.product?.packageHeightCm,
        ) || item.product?.dimensions;
      if (dimStr && !hasDimensions) {
        maxDimensions = dimStr;
        hasDimensions = true;
      }
    }
    return {
      weight: totalWeight > 0 ? totalWeight.toFixed(2) : '',
      dimensions: maxDimensions,
    };
  }, [order?.items]);

  const formatDeliveryDate = (isoDate: string | null | undefined) => {
    if (!isoDate) return null;
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const computeEstDeliveryDate = (days: number | null | undefined) => {
    if (!days) return null;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setOrderLoading(true);
    setOrderError(null);
    try {
      const data = await apiGetSellerOrder(orderId) as SellerOrder;
      setOrder(data);
      if (data.status !== 'CONFIRMED' || data.paymentStatus !== 'PAID') {
        setOrderError('This order cannot be shipped at this time.');
      }
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setOrderLoading(false);
    }
  }, [orderId]);

  const loadShippingData = useCallback(async () => {
    if (!orderId) return;
    setLoadingConfigs(true);
    setRatesLoading(true);
    try {
      const [configs, rates, locations, serviceability] = await Promise.allSettled([
        apiGetCourierConfigs(),
        apiGetShippingRates(),
        apiListPickupLocations(),
        apiCheckServiceability(orderId),
      ]);
      const providers = configs.status === 'fulfilled' && Array.isArray(configs.value)
        ? (configs.value as CourierConfig[]).filter((c) => c.isActive).map((c) => c.provider)
        : [];
      setConfiguredProviders(providers);
      if (rates.status === 'fulfilled') setShippingRates(rates.value);

      const locs = locations.status === 'fulfilled' && Array.isArray(locations.value)
        ? locations.value
        : [];
      setPickupLocations(locs);
      const def = locs.find((l) => l.isDefault) || locs[0];
      setSelectedPickupLocationId(def?.id || '');

      const svcData = serviceability.status === 'fulfilled' ? serviceability.value as Record<string, any> : {};
      const ratesList: ServiceabilityRate[] = [];

      for (const [key, val] of Object.entries(svcData)) {
        if (!val) continue;
        if (val.availableCouriers && Array.isArray(val.availableCouriers)) {
          for (const courier of val.availableCouriers) {
            ratesList.push({
              provider: key.toLowerCase(),
              providerKey: key,
              service: courier.name || val.provider || key,
              cost: courier.charges ?? null,
              estimatedDays: courier.estimatedDays ?? null,
              estimatedDelivery: formatDeliveryDate(courier.estimatedDelivery) || computeEstDeliveryDate(courier.estimatedDays),
              serviceable: true,
              carrierBackend:
                typeof courier.carrierBackend === 'string' ? courier.carrierBackend : undefined,
            });
          }
        } else if (val.serviceable) {
          ratesList.push({
            provider: val.provider || key,
            providerKey: key,
            service: key === 'XELNOVA_COURIER' ? 'Surface' : (val.service || val.provider || key),
            cost: val.charges ?? null,
            estimatedDays: val.estimatedDays ?? null,
            estimatedDelivery: formatDeliveryDate(val.estimatedDelivery) || computeEstDeliveryDate(val.estimatedDays),
            serviceable: true,
            carrierBackend:
              key === 'XELNOVA_COURIER' && typeof val.carrierBackend === 'string'
                ? val.carrierBackend
                : undefined,
          });
        }
      }

      for (const p of providers) {
        const hasRate = ratesList.some(r => r.providerKey === p);
        if (!hasRate && svcData[p] && !svcData[p].serviceable) {
          ratesList.push({
            provider: svcData[p].provider || p,
            providerKey: p,
            service: svcData[p].provider || p,
            cost: null,
            estimatedDays: null,
            estimatedDelivery: null,
            serviceable: false,
          });
        }
      }
      setServiceabilityRates(ratesList);

      return providers;
    } catch {
      setConfiguredProviders([]);
      setPickupLocations([]);
      setSelectedPickupLocationId('');
      setServiceabilityRates([]);
      return [];
    } finally {
      setLoadingConfigs(false);
      setRatesLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (order && !orderError) {
      setStep('loading');
      setSelectedCourier('');
      setSelectedRate(null);
      const defaults = getDefaultShippingInfo();
      setWeight(defaults.weight);
      setDimensions(defaults.dimensions);
      setResult(null);
      setPickupPhone('');
      setPhoneError(null);
      setPhoneReturnStep('pickup');

      const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const istHour = nowIst.getUTCHours();
      const istDay = nowIst.getUTCDay();
      const slot = new Date(nowIst);
      if (istHour < 13 && istDay !== 0) {
        slot.setUTCHours(16, 0, 0, 0);
      } else {
        slot.setUTCDate(slot.getUTCDate() + 1);
        while (slot.getUTCDay() === 0) slot.setUTCDate(slot.getUTCDate() + 1);
        slot.setUTCHours(11, 0, 0, 0);
      }
      const yyyy = slot.getUTCFullYear();
      const mm = String(slot.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(slot.getUTCDate()).padStart(2, '0');
      const hh = String(slot.getUTCHours()).padStart(2, '0');
      const mi = String(slot.getUTCMinutes()).padStart(2, '0');
      setShipPickupDate(`${yyyy}-${mm}-${dd}`);
      setShipPickupTime(`${hh}:${mi}`);
      setShipPickupPackages(1);
      setSkipPickupAtBooking(false);

      loadShippingData().then(() => {
        setStep('rates');
      });
    }
  }, [order, orderError, getDefaultShippingInfo, loadShippingData]);

  const xelgoRates = serviceabilityRates.filter(r => r.providerKey === 'XELNOVA_COURIER');
  const partnerRatesAll = serviceabilityRates.filter(r => r.providerKey !== 'XELNOVA_COURIER');
  const partnerRates = partnerRatesAll.filter(r => r.serviceable);
  const partnerRatesUnavailable = partnerRatesAll.filter(r => !r.serviceable);

  const getProviderName = (id: string) => COURIER_PROVIDERS.find((c) => c.id === id)?.name || id;

  const buildShipBody = useCallback(
    (mode: 'courier' | 'selfship') => {
      const body: any = {
        shippingMode: mode === 'selfship' ? 'SELF_SHIP' : selectedCourier,
      };
      if (mode === 'selfship') {
        // no extra fields for selfship
      } else {
        body.weight = weight ? parseFloat(weight) : undefined;
        body.dimensions = dimensions.trim() || undefined;
        if (selectedPickupLocationId) {
          body.pickupLocationId = selectedPickupLocationId;
        }
        if (!skipPickupAtBooking && shipPickupDate && selectedCourier === 'XELNOVA_COURIER') {
          body.pickupDate = shipPickupDate;
          body.pickupTime = shipPickupTime
            ? `${shipPickupTime}${shipPickupTime.length === 5 ? ':00' : ''}`
            : undefined;
          body.expectedPackageCount = Math.max(1, shipPickupPackages || 1);
        }
        if (selectedCourier === 'XELNOVA_COURIER' && selectedRate?.carrierBackend) {
          body.platformCourier = selectedRate.carrierBackend;
        }
      }
      return body;
    },
    [
      selectedCourier,
      selectedRate,
      weight,
      dimensions,
      skipPickupAtBooking,
      shipPickupDate,
      shipPickupTime,
      shipPickupPackages,
      selectedPickupLocationId,
    ],
  );

  const isPickupPhoneError = (err: unknown): boolean => {
    if (!(err instanceof Error)) return false;
    const m = err.message.toLowerCase();
    return m.includes('pickup phone') || m.includes('pickup contact');
  };

  const submitShipment = async (mode: 'courier' | 'selfship'): Promise<boolean> => {
    if (savingLock.current) return false;
    savingLock.current = true;
    setSaving(true);
    try {
      const body = buildShipBody(mode);
      const res = await apiShipOrder(orderId, body);
      setResult(res);
      setStep('result');
      return true;
    } catch (err: unknown) {
      if (isPickupPhoneError(err) && mode !== 'selfship') {
        setPhoneReturnStep('pickup');
        setPhoneError(null);
        setStep('add-phone');
        return false;
      }
      toast.error(err instanceof Error ? err.message : 'Failed to ship order');
      return false;
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  };

  const handleBookSelfShip = async () => {
    await submitShipment('selfship');
  };

  const handleSelectRateAndContinue = (rate: ServiceabilityRate) => {
    setSelectedRate(rate);
    setSelectedCourier(rate.providerKey);
    setStep('pickup');
  };

  const handleSavePhoneAndShip = async () => {
    const digits = pickupPhone.replace(/[^\d+]/g, '');
    const cleanLen = digits.replace(/[^\d]/g, '').length;
    if (cleanLen < 10) {
      setPhoneError('Enter a valid mobile number (at least 10 digits).');
      return;
    }
    setPhoneError(null);
    setPhoneSaving(true);
    try {
      await apiUpdateProfile({ phone: digits });
      toast.success('Pickup phone saved');
      const submitMode: 'courier' | 'selfship' = 'courier';
      const success = await submitShipment(submitMode);
      if (!success) {
        setStep(phoneReturnStep);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save phone';
      setPhoneError(msg);
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleDownloadLabel = async () => {
    try {
      await apiDownloadShippingLabel(orderId);
      toast.success('Shipping label downloaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download label');
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      await apiDownloadCustomerInvoice(orderId);
      toast.success('Invoice downloaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download invoice');
    }
  };

  if (orderLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8">
        <Loader2 size={28} className="animate-spin text-primary-500" />
        <p className="text-sm text-text-muted">Loading order...</p>
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
        <div className="rounded-full bg-red-100 p-4">
          <Package size={32} className="text-red-600" />
        </div>
        <p className="text-sm text-text-muted">{orderError || 'Order not found'}</p>
        <Button variant="outline" onClick={() => router.push('/orders')}>
          <ArrowLeft size={14} />
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Ship Order"
        subtitle={`Order #${order.orderNumber}`}
        actions={
          <Button variant="outline" onClick={() => router.push('/orders')}>
            <ArrowLeft size={14} />
            Back to Orders
          </Button>
        }
      />

      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Order Summary Card */}
        <div className="rounded-2xl border border-border bg-white p-4 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-text-muted">Shipping to</p>
              <p className="text-sm font-semibold text-text-primary mt-0.5">
                {order.shippingAddress?.fullName || order.user.name}
              </p>
              {order.shippingAddress && (
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  {order.shippingAddress.addressLine1}
                  {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Order Total</p>
              <p className="text-lg font-bold text-text-primary">
                ₹{Number(order.total).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {order.items.length} item{order.items.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Shipping Flow */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <AnimatePresence mode="wait">
            {step === 'loading' && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 flex flex-col items-center gap-3">
                <Loader2 size={28} className="animate-spin text-primary-500" />
                <p className="text-sm text-text-muted">Fetching shipping rates...</p>
              </motion.div>
            )}

            {step === 'rates' && (
              <motion.div key="rates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary">Choose Shipping Method</h3>
                </div>

                {ratesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-500" /></div>
                ) : (
                  <div className="space-y-5">
                    {/* Ship via Xelgo */}
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="h-5 w-5 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Truck size={11} className="text-white" />
                        </div>
                        <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Ship via Xelgo</h4>
                        <span className="text-[10px] text-blue-400 font-normal">Xelgo handles pickup, AWB &amp; tracking</span>
                      </div>
                      <div className="space-y-2">
                        {xelgoRates.length > 0 ? xelgoRates.map((rate, i) => {
                          const parts = rate.service.split(/\s+/);
                          const cName = parts.slice(0, -1).join(' ') || parts[0];
                          const serviceType = parts.length > 1 ? parts[parts.length - 1] : '';
                          return (
                            <div
                              key={`xelgo-${i}`}
                              className="group flex items-center justify-between rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-white p-3.5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                              onClick={() => handleSelectRateAndContinue(rate)}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0 h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <Package size={16} className="text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold text-text-primary truncate">{cName}</span>
                                    {serviceType && <span className="text-[10px] text-blue-500 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 font-medium">{serviceType}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {rate.cost != null && <span className="text-xs font-bold text-text-primary">₹{rate.cost}</span>}
                                    {rate.cost == null && <span className="text-xs text-text-muted italic">Price at booking</span>}
                                    {rate.estimatedDelivery && (
                                      <>
                                        <span className="text-text-muted">·</span>
                                        <span className="text-xs text-text-secondary flex items-center gap-1"><Calendar size={10} />{rate.estimatedDelivery}</span>
                                      </>
                                    )}
                                    {!rate.estimatedDelivery && rate.estimatedDays && (
                                      <>
                                        <span className="text-text-muted">·</span>
                                        <span className="text-xs text-text-secondary">{rate.estimatedDays} day{rate.estimatedDays > 1 ? 's' : ''}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button size="sm" className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                <ArrowRight size={14} />
                                Book
                              </Button>
                            </div>
                          );
                        }) : (
                          <div
                            className="group flex items-center justify-between rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-white p-3.5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                            onClick={() => { setSelectedCourier('XELNOVA_COURIER'); setStep('pickup'); }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Package size={16} className="text-blue-600" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-text-primary">Xelgo Surface</span>
                                <p className="text-xs text-text-muted mt-0.5">Price calculated at booking based on weight</p>
                              </div>
                            </div>
                            <Button size="sm" className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              <ArrowRight size={14} />
                              Book
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seller's Delivery Partners */}
                    {(partnerRates.length > 0 || partnerRatesUnavailable.length > 0) && (
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="h-5 w-5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                            <Navigation size={11} className="text-white" />
                          </div>
                          <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Your Courier Accounts</h4>
                          <span className="text-[10px] text-emerald-400 font-normal">Book directly with your connected couriers</span>
                        </div>
                        <div className="space-y-2">
                          {partnerRates.map((rate, i) => (
                            <div
                              key={`partner-${i}`}
                              className="group flex items-center justify-between rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/60 to-white p-3.5 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer"
                              onClick={() => handleSelectRateAndContinue(rate)}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0 h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                                  <Truck size={16} className="text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold text-text-primary truncate">{getProviderName(rate.providerKey)}</span>
                                    {rate.service && rate.service !== rate.providerKey && (
                                      <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 font-medium">{rate.service}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {rate.cost != null && <span className="text-xs font-bold text-text-primary">₹{rate.cost}</span>}
                                    {rate.cost == null && <span className="text-xs text-text-muted italic">Price at booking</span>}
                                    {rate.estimatedDelivery && (
                                      <>
                                        <span className="text-text-muted">·</span>
                                        <span className="text-xs text-text-secondary flex items-center gap-1"><Calendar size={10} />{rate.estimatedDelivery}</span>
                                      </>
                                    )}
                                    {!rate.estimatedDelivery && rate.estimatedDays && (
                                      <>
                                        <span className="text-text-muted">·</span>
                                        <span className="text-xs text-text-secondary">{rate.estimatedDays} day{rate.estimatedDays > 1 ? 's' : ''}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button size="sm" variant="outline" className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                <ArrowRight size={14} />
                                Book
                              </Button>
                            </div>
                          ))}
                          {partnerRatesUnavailable.map((rate, i) => (
                            <div
                              key={`partner-na-${i}`}
                              className="flex items-center justify-between rounded-xl border border-gray-200 border-dashed bg-gray-50/50 p-3.5 opacity-70"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0 h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <Truck size={16} className="text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-sm font-medium text-text-secondary truncate">{getProviderName(rate.providerKey)}</span>
                                  <p className="text-xs text-text-muted mt-0.5">Not serviceable for this pincode</p>
                                </div>
                              </div>
                              <span className="text-[10px] text-text-muted bg-gray-100 px-2 py-1 rounded-md font-medium">Unavailable</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Self Ship */}
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="h-5 w-5 rounded-md bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                          <PackageCheck size={11} className="text-white" />
                        </div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Self Ship</h4>
                        <span className="text-[10px] text-gray-400 font-normal">You ship it yourself</span>
                      </div>
                      <div
                        className="group flex items-center justify-between rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50/60 to-white p-3.5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                        onClick={handleBookSelfShip}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <PackageCheck size={16} className="text-gray-500" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-text-primary">Ship with your own courier</span>
                            <p className="text-xs text-text-muted mt-0.5">You arrange pickup &amp; delivery yourself</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" loading={saving}>
                          <ArrowRight size={14} />
                          Book
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!ratesLoading && xelgoRates.length === 0 && partnerRates.length === 0 && configuredProviders.length === 0 && (
                  <div className="rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-blue-100 p-2 shrink-0">
                        <Navigation size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-800">Connect your courier accounts for better rates</p>
                        <p className="text-[11px] text-blue-600 mt-1 leading-relaxed">
                          Link Delhivery, ShipRocket, XpressBees, or Ekart in{' '}
                          <a href="/shipping" className="text-primary-600 underline font-semibold hover:text-primary-700">Shipping Settings</a>{' '}
                          to book shipments directly at your negotiated rates.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {!ratesLoading && xelgoRates.some(r => !r.cost) && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                    <p className="text-xs text-blue-700">
                      Some Xelgo rates show &ldquo;price at booking&rdquo;. The exact shipping charge will be calculated based on package weight and dimensions.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'pickup' && (
              <motion.div
                key="pickup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep('rates')}
                    disabled={saving}
                    className="p-1 rounded hover:bg-gray-100 text-text-muted disabled:opacity-50"
                    aria-label="Back"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <p className="text-sm font-semibold text-text-primary">
                    Package details &amp; pickup schedule
                  </p>
                </div>

                {selectedRate && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-600" />
                      <p className="text-xs text-emerald-700 font-medium">
                        Shipping via {selectedRate.providerKey === 'XELNOVA_COURIER' ? 'Xelgo' : getProviderName(selectedRate.providerKey)}
                        {selectedRate.cost != null && ` · ₹${selectedRate.cost}`}
                        {selectedRate.estimatedDays && ` · ${selectedRate.estimatedDays} day${selectedRate.estimatedDays > 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    stackedLabel
                    label="Package Weight (kg)"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 0.5"
                    icon={<Weight size={14} />}
                  />
                  <Input
                    stackedLabel
                    label="Dimensions L×B×H (cm)"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="e.g. 30x20x15"
                    icon={<Ruler size={14} />}
                  />
                </div>

                {selectedCourier !== 'XELNOVA_COURIER' && pickupLocations.length > 0 && (
                  <p className="text-[11px] text-text-muted rounded-lg border border-border bg-gray-50 px-3 py-2">
                    Booking uses your default pickup address on file. Manage locations in{' '}
                    <a href="/shipping" className="text-primary-600 font-medium hover:underline">Shipping</a>.
                  </p>
                )}

                {selectedCourier === 'XELNOVA_COURIER' && pickupLocations.length > 0 && (() => {
                  const selected = pickupLocations.find((l) => l.id === selectedPickupLocationId);
                  const showDropdown = pickupLocations.length > 1;
                  return (
                    <div className="rounded-xl border border-border bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-text-muted">
                          Pickup from
                        </label>
                        <a href="/shipping" target="_blank" rel="noreferrer" className="text-[11px] text-primary-600 hover:underline">
                          Manage locations
                        </a>
                      </div>
                      {showDropdown ? (
                        <select
                          value={selectedPickupLocationId}
                          onChange={(e) => setSelectedPickupLocationId(e.target.value)}
                          className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                        >
                          {pickupLocations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.label}{loc.isDefault ? ' (default)' : ''} — {loc.city}, {loc.pincode}
                            </option>
                          ))}
                        </select>
                      ) : (
                        selected && (
                          <p className="text-sm font-medium text-text-primary">
                            {selected.label}
                            <span className="text-xs text-text-muted font-normal ml-1">(only address)</span>
                          </p>
                        )
                      )}
                      {selected && (
                        <p className="text-[11px] text-text-muted leading-relaxed">
                          {selected.addressLine}, {selected.city}, {selected.state} – {selected.pincode}
                          {selected.phone && <> · {selected.phone}</>}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {selectedCourier === 'XELNOVA_COURIER' && (
                  <>
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                      <p className="text-xs text-blue-800 leading-relaxed">
                        Tell <strong>Xelgo</strong> when the partner courier should arrive at your warehouse.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1.5">Pickup date *</label>
                        <input
                          type="date"
                          value={shipPickupDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => { setShipPickupDate(e.target.value); setSkipPickupAtBooking(false); }}
                          disabled={skipPickupAtBooking}
                          className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1.5">Pickup time (IST)</label>
                        <input
                          type="time"
                          value={shipPickupTime}
                          onChange={(e) => { setShipPickupTime(e.target.value); setSkipPickupAtBooking(false); }}
                          disabled={skipPickupAtBooking}
                          className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer select-none rounded-xl border border-border p-3 hover:bg-gray-50/50">
                      <input
                        type="checkbox"
                        checked={skipPickupAtBooking}
                        onChange={(e) => setSkipPickupAtBooking(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xs text-text-secondary leading-relaxed">
                        <span className="font-medium text-text-primary">Book shipment only — schedule pickup later.</span>
                      </span>
                    </label>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep('rates')} disabled={saving}>Back</Button>
                  <Button
                    onClick={async () => {
                      const w = parseFloat(weight);
                      if (!weight || Number.isNaN(w) || w <= 0) {
                        toast.error('Enter the package weight in kg');
                        return;
                      }
                      await submitShipment('courier');
                    }}
                    loading={saving}
                    disabled={saving}
                  >
                    <Truck size={14} />
                    {skipPickupAtBooking ? 'Book Shipment' : 'Book Shipment & Schedule Pickup'}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'add-phone' && (
              <motion.div
                key="add-phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(phoneReturnStep)}
                    disabled={phoneSaving || saving}
                    className="p-1 rounded hover:bg-gray-100 text-text-muted disabled:opacity-50"
                    aria-label="Back"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <p className="text-sm font-semibold text-text-primary">One last thing</p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-100 p-2 shrink-0">
                      <Phone size={16} className="text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900">Add a pickup phone number</p>
                      <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                        Our courier partner needs a contact number for the rider who picks up your shipment.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Input
                    stackedLabel
                    label="Pickup phone number"
                    value={pickupPhone}
                    onChange={(e) => { setPickupPhone(e.target.value); if (phoneError) setPhoneError(null); }}
                    placeholder="10-digit mobile, e.g. 9876543210"
                    type="tel"
                    inputMode="tel"
                    icon={<Phone size={14} />}
                    autoFocus
                  />
                  {phoneError && <p className="mt-1.5 text-xs text-red-600">{phoneError}</p>}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(phoneReturnStep)} disabled={phoneSaving || saving}>Back</Button>
                  <Button onClick={handleSavePhoneAndShip} loading={phoneSaving || saving} disabled={phoneSaving || saving}>
                    <Truck size={14} />
                    Save &amp; book shipment
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'result' && result && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="flex flex-col items-center text-center">
                  <div className="rounded-full bg-emerald-100 p-3">
                    <CheckCircle size={32} className="text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mt-3">Shipment Created!</h3>
                  {result.courierProvider && (
                    <p className="text-sm text-text-secondary mt-1">
                      Shipped via <strong>{result.courierProvider}</strong>
                    </p>
                  )}
                </div>

                {result.awbNumber && (
                  <div className="rounded-xl bg-gray-50 border border-border p-4 text-center">
                    <p className="text-xs text-text-muted mb-1">AWB / Tracking Number</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-lg font-mono font-bold text-text-primary">{result.awbNumber}</p>
                      <button onClick={() => { navigator.clipboard.writeText(result.awbNumber); toast.success('AWB copied'); }}
                        className="p-1 rounded hover:bg-gray-200 text-text-muted"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-text-primary">Shipment Details</p>
                  </div>
                  <div className="divide-y divide-border text-sm">
                    {result.courierOrderId && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-text-muted">Courier Reference</span>
                        <span className="text-xs font-medium text-text-primary font-mono">{result.courierOrderId}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-text-muted">Shipping Mode</span>
                      <span className="text-xs font-medium text-text-primary">
                        {result.shippingMode === 'SELF_SHIP' ? 'Self Ship' : result.shippingMode === 'XELNOVA_COURIER' ? 'Xelgo (Platform)' : result.courierProvider || result.shippingMode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-text-muted">Status</span>
                      <Badge variant={result.shipmentStatus === 'PICKUP_SCHEDULED' ? 'success' : 'info'} className="text-[10px]">
                        {(result.shipmentStatus || 'BOOKED').replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {result.courierCharges != null && result.courierCharges > 0 && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-text-muted">Shipping Charges</span>
                        <span className="text-xs font-semibold text-text-primary">₹{result.courierCharges}</span>
                      </div>
                    )}
                    {result.weight && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-text-muted">Package Weight</span>
                        <span className="text-xs font-medium text-text-primary">{result.weight} kg</span>
                      </div>
                    )}
                    {result.dimensions && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-text-muted">Dimensions (L×B×H)</span>
                        <span className="text-xs font-medium text-text-primary">{result.dimensions} cm</span>
                      </div>
                    )}
                    {result.pickupDate && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-text-muted">Expected Pickup</span>
                        <span className="text-xs font-medium text-text-primary">
                          {new Date(result.pickupDate).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
                          })}
                        </span>
                      </div>
                    )}
                    {result.labelUrl && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-text-muted">Shipping Label</span>
                        <a href={result.labelUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 font-medium hover:underline inline-flex items-center gap-1">
                          <ExternalLink size={10} /> View Label
                        </a>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-text-muted">Booked At</span>
                      <span className="text-xs font-medium text-text-primary">
                        {new Date(result.createdAt).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {result.pickup && (
                  <div
                    className={`rounded-xl border p-3 text-left ${
                      result.pickup.scheduled
                        ? 'border-emerald-200 bg-emerald-50'
                        : result.pickup.requested
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${
                      result.pickup.scheduled ? 'text-emerald-800' : result.pickup.requested ? 'text-amber-800' : 'text-blue-800'
                    }`}>
                      {result.pickup.scheduled ? 'Pickup scheduled' : result.pickup.requested ? 'Pickup not scheduled' : 'Schedule pickup separately'}
                    </p>
                    <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{result.pickup.message}</p>
                    {result.pickup.scheduledFor && (
                      <p className="text-[11px] text-text-muted mt-1">
                        Slot: {new Date(result.pickup.scheduledFor).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
                        })} (IST){result.pickup.pickupId ? ` · ref ${result.pickup.pickupId}` : ''}
                      </p>
                    )}
                  </div>
                )}

                {result.trackingUrl && (
                  <div className="text-center">
                    <a href={result.trackingUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline font-medium"
                    >
                      <ExternalLink size={13} /> Track Shipment
                    </a>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleDownloadLabel}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-purple-700 border border-purple-200 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <Download size={14} />
                    Shipping Label
                  </button>
                  <button
                    onClick={handleDownloadInvoice}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-700 border border-blue-200 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Download size={14} />
                    Invoice
                  </button>
                </div>

                <Button onClick={() => router.push('/orders')} fullWidth>
                  Done — Back to Orders
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
