'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Plus, Trash2, Edit2, Check, Eye, EyeOff,
  ExternalLink, Loader2, AlertCircle, CheckCircle2, Settings,
  Shield, Link2, MapPin, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button, Input, Modal, Badge } from '@xelnova/ui';
import {
  apiGetCourierConfigs,
  apiSaveCourierConfig,
  apiDeleteCourierConfig,
  apiGetShippingRates,
  apiGetProfile,
  apiUpdateProfile,
  apiGetPickupWarehouse,
  apiRegisterPickupWarehouse,
  type ShippingRates,
  type PickupWarehouseStatus,
} from '@/lib/api';

interface CourierConfig {
  id: string;
  provider: string;
  apiKey: string;
  apiSecret: string | null;
  accountId: string | null;
  warehouseId: string | null;
  isActive: boolean;
  metadata: Record<string, any> | null;
  createdAt: string;
}

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  placeholder: string;
  secret?: boolean;
  helpText?: string;
}

interface ProviderDef {
  id: string;
  name: string;
  tagline: string;
  howToConnect: string;
  logo: string;
  fields: FieldDef[];
  docsUrl: string;
  docsLabel: string;
}

/**
 * Each provider's `fields[].key` maps directly to the DB column
 * that the backend reads when calling the courier API:
 *
 *   apiKey      → SellerCourierConfig.apiKey
 *   apiSecret   → SellerCourierConfig.apiSecret
 *   accountId   → SellerCourierConfig.accountId
 *   warehouseId → SellerCourierConfig.warehouseId
 */
const PROVIDERS: ProviderDef[] = [
  {
    id: 'DELHIVERY',
    name: 'Delhivery',
    tagline: 'India\'s largest express logistics company',
    howToConnect: 'Login to Delhivery One → Settings → API Setup → Copy your API Token. Then go to Settings → Warehouses to find your pickup location name.',
    logo: '📦',
    fields: [
      {
        key: 'apiKey',
        label: 'API Token',
        required: true,
        placeholder: 'Paste your API token here',
        secret: true,
        helpText: 'Found at Settings → API Setup in your Delhivery One dashboard',
      },
      {
        key: 'accountId',
        label: 'Client Name',
        required: true,
        placeholder: 'Your registered business name',
        helpText: 'Must match exactly (case-sensitive) as registered on Delhivery',
      },
      {
        key: 'warehouseId',
        label: 'Pickup Location Name',
        required: true,
        placeholder: 'e.g. Delhi_Main_Warehouse',
        helpText: 'Exact name of your registered warehouse from Settings → Warehouses. This is required for shipment booking.',
      },
    ],
    docsUrl: 'https://one.delhivery.com/home',
    docsLabel: 'Open Delhivery Dashboard',
  },
  {
    id: 'SHIPROCKET',
    name: 'ShipRocket',
    tagline: 'Courier aggregator with 17+ courier partners',
    howToConnect: 'Login to ShipRocket → Settings → API → Create a new API User (use a separate email, not your login).',
    logo: '🚀',
    fields: [
      {
        key: 'accountId',
        label: 'API User Email',
        required: true,
        placeholder: 'e.g. api@yourcompany.com',
        helpText: 'The email you used to create the API User (not your login email)',
      },
      {
        key: 'apiKey',
        label: 'API User Password',
        required: true,
        placeholder: 'Password for the API user',
        secret: true,
        helpText: 'The password you set while creating the API User in ShipRocket',
      },
      {
        key: 'warehouseId',
        label: 'Pickup Location',
        required: false,
        placeholder: 'e.g. Primary',
        helpText: 'Exact name of your pickup address in ShipRocket. Defaults to "Primary".',
      },
    ],
    docsUrl: 'https://app.shiprocket.in/newlogin',
    docsLabel: 'Open ShipRocket Dashboard',
  },
  {
    id: 'XPRESSBEES',
    name: 'XpressBees',
    tagline: 'Fast-growing logistics with same-day & next-day delivery',
    howToConnect: 'Use your login credentials from shipment.xpressbees.com to connect.',
    logo: '🐝',
    fields: [
      {
        key: 'accountId',
        label: 'Login Email',
        required: true,
        placeholder: 'Your XpressBees login email',
        helpText: 'The email you use to log in at shipment.xpressbees.com',
      },
      {
        key: 'apiSecret',
        label: 'Login Password',
        required: true,
        placeholder: 'Your XpressBees login password',
        secret: true,
        helpText: 'We use this to generate a temporary auth token (not stored in plain text)',
      },
      {
        key: 'warehouseId',
        label: 'Pickup Warehouse',
        required: false,
        placeholder: 'e.g. Main Warehouse',
        helpText: 'Registered warehouse name from Settings → Warehouse in XpressBees.',
      },
    ],
    docsUrl: 'https://shipment.xpressbees.com/dash',
    docsLabel: 'Open XpressBees Dashboard',
  },
  {
    id: 'EKART',
    name: 'Ekart Elite',
    tagline: 'Flipkart\'s logistics arm with pan-India coverage',
    howToConnect: 'Login to Ekart Elite → Settings → API Documentation → Copy your Client ID, Username and Password.',
    logo: '📬',
    fields: [
      {
        key: 'accountId',
        label: 'Client ID',
        required: true,
        placeholder: 'e.g. EKART_698317571ff77a997480dcce',
        helpText: 'Found in your Ekart Elite dashboard under API settings',
      },
      {
        key: 'apiKey',
        label: 'API Username',
        required: true,
        placeholder: 'Your Ekart API username',
        helpText: 'API username from Ekart Elite → Settings → API Documentation',
      },
      {
        key: 'apiSecret',
        label: 'API Password',
        required: true,
        placeholder: 'Your Ekart API password',
        secret: true,
        helpText: 'API password from Ekart Elite → Settings → API Documentation',
      },
      {
        key: 'warehouseId',
        label: 'Pickup Location Alias',
        required: false,
        placeholder: 'e.g. Delhi-Warehouse',
        helpText: 'Registered pickup location alias in Ekart. Leave empty to use default.',
      },
    ],
    docsUrl: 'https://app.elite.ekartlogistics.in/',
    docsLabel: 'Open Ekart Dashboard',
  },
];

export default function ShippingSettingsPage() {
  const [configs, setConfigs] = useState<CourierConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [rates, setRates] = useState<ShippingRates | null>(null);
  // Pickup address (testing observation #8) — sourced from the seller's
  // business address on the profile. Sellers can edit it inline here so
  // they don't need to update each courier's portal separately.
  const [pickupAddress, setPickupAddress] = useState({
    businessAddress: '',
    businessCity: '',
    businessState: '',
    businessPincode: '',
  });
  const [savingPickup, setSavingPickup] = useState(false);
  const [pickupDirty, setPickupDirty] = useState(false);
  // Per-seller Xelgo (Ship-with-Xelnova) pickup warehouse — auto-registered
  // with Delhivery on first ship so the rider goes to THIS seller's
  // address instead of the platform's master warehouse.
  const [xelgoWh, setXelgoWh] = useState<PickupWarehouseStatus | null>(null);
  const [xelgoWhLoading, setXelgoWhLoading] = useState(true);
  const [xelgoWhSaving, setXelgoWhSaving] = useState(false);

  const loadXelgoWarehouse = useCallback(async () => {
    setXelgoWhLoading(true);
    try {
      const data = await apiGetPickupWarehouse();
      setXelgoWh(data);
    } catch (err) {
      console.warn('Failed to load Xelgo pickup warehouse status', err);
    } finally {
      setXelgoWhLoading(false);
    }
  }, []);

  const handleRegisterXelgoWarehouse = async () => {
    setXelgoWhSaving(true);
    try {
      const result = await apiRegisterPickupWarehouse();
      toast.success(result.message || `Warehouse "${result.warehouseName}" registered.`);
      await loadXelgoWarehouse();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register warehouse');
    } finally {
      setXelgoWhSaving(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [configsRes, ratesRes, profileRes] = await Promise.allSettled([
        apiGetCourierConfigs(),
        apiGetShippingRates(),
        apiGetProfile(),
      ]);
      setConfigs(configsRes.status === 'fulfilled' && Array.isArray(configsRes.value) ? configsRes.value : []);
      if (ratesRes.status === 'fulfilled') setRates(ratesRes.value);
      if (profileRes.status === 'fulfilled' && profileRes.value && typeof profileRes.value === 'object') {
        const p = profileRes.value as Record<string, unknown>;
        setPickupAddress({
          businessAddress: typeof p.businessAddress === 'string' ? p.businessAddress : '',
          businessCity: typeof p.businessCity === 'string' ? p.businessCity : '',
          businessState: typeof p.businessState === 'string' ? p.businessState : '',
          businessPincode: typeof p.businessPincode === 'string' ? p.businessPincode : '',
        });
        setPickupDirty(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSavePickup = async () => {
    if (!pickupAddress.businessAddress.trim() || !pickupAddress.businessPincode.trim()) {
      toast.error('Address and pincode are required');
      return;
    }
    setSavingPickup(true);
    try {
      await apiUpdateProfile({
        businessAddress: pickupAddress.businessAddress.trim(),
        businessCity: pickupAddress.businessCity.trim(),
        businessState: pickupAddress.businessState.trim(),
        businessPincode: pickupAddress.businessPincode.trim(),
      });
      toast.success('Pickup address updated');
      setPickupDirty(false);
      loadXelgoWarehouse();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save pickup address');
    } finally {
      setSavingPickup(false);
    }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadXelgoWarehouse(); }, [loadXelgoWarehouse]);

  const getConfigForProvider = (providerId: string) =>
    configs.find((c) => c.provider === providerId);

  const openEditModal = (providerId: string) => {
    const existing = getConfigForProvider(providerId);
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) return;

    const data: Record<string, string> = {};
    provider.fields.forEach((f) => {
      if (f.secret) {
        data[f.key] = '';
      } else if (f.key === 'accountId') {
        data.accountId = existing?.accountId || '';
      } else if (f.key === 'warehouseId') {
        data.warehouseId = existing?.warehouseId || '';
      } else {
        data[f.key] = '';
      }
    });
    setFormData(data);
    setShowSecrets({});
    setEditModal(providerId);
  };

  const handleSave = async () => {
    if (!editModal) return;
    const provider = PROVIDERS.find((p) => p.id === editModal);
    if (!provider) return;

    const requiredFields = provider.fields.filter((f) => f.required);
    const existing = getConfigForProvider(editModal);

    for (const field of requiredFields) {
      const value = formData[field.key]?.trim();
      if (!value && !(existing && field.secret)) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = { provider: editModal };

      provider.fields.forEach((f) => {
        const value = formData[f.key]?.trim();
        if (f.key === 'apiKey') {
          payload.apiKey = value || '';
        } else if (f.key === 'apiSecret') {
          if (value) payload.apiSecret = value;
        } else if (f.key === 'accountId') {
          if (value) payload.accountId = value;
        } else if (f.key === 'warehouseId') {
          payload.warehouseId = value || undefined;
        }
      });

      if (!payload.apiKey) {
        payload.apiKey = existing ? '__KEEP_EXISTING__' : '';
      }

      await apiSaveCourierConfig(payload as any);
      toast.success(`${provider.name} connected successfully!`);
      setEditModal(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (providerId: string) => {
    setSaving(true);
    try {
      await apiDeleteCourierConfig(providerId);
      toast.success('Configuration removed');
      setDeleteConfirm(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const activeProvider = PROVIDERS.find((p) => p.id === editModal);
  const existingConfig = editModal ? getConfigForProvider(editModal) : null;

  return (
    <>
      <DashboardHeader title="Shipping Settings" />
      <div className="p-6 space-y-6 max-w-4xl">

        {/* Pickup address (testing observation #8) — applies to BOTH self-ship
            and integrated couriers. Saved values are passed as the return /
            seller address on every shipment booking. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary-50 p-2">
                <MapPin size={18} className="text-primary-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Pickup Address</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Used for both self-ship and integrated couriers as your pickup / return address.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleSavePickup}
              loading={savingPickup}
              disabled={!pickupDirty}
            >
              <Save size={12} /> Save
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Address line"
                value={pickupAddress.businessAddress}
                onChange={(e) => { setPickupAddress((p) => ({ ...p, businessAddress: e.target.value })); setPickupDirty(true); }}
                placeholder="Building / street / area"
              />
            </div>
            <Input
              label="City"
              value={pickupAddress.businessCity}
              onChange={(e) => { setPickupAddress((p) => ({ ...p, businessCity: e.target.value })); setPickupDirty(true); }}
              placeholder="e.g. Mumbai"
            />
            <Input
              label="State"
              value={pickupAddress.businessState}
              onChange={(e) => { setPickupAddress((p) => ({ ...p, businessState: e.target.value })); setPickupDirty(true); }}
              placeholder="e.g. Maharashtra"
            />
            <Input
              label="Pincode"
              value={pickupAddress.businessPincode}
              onChange={(e) => { setPickupAddress((p) => ({ ...p, businessPincode: e.target.value })); setPickupDirty(true); }}
              placeholder="6-digit PIN"
            />
          </div>
        </motion.div>

        {/* Per-seller pickup warehouse for Ship-with-Xelnova (Xelgo).
            We register THIS seller's address with our master Delhivery
            account so the rider routes to their location, not the
            platform's warehouse. Lazy & idempotent — first ship triggers
            registration; the seller can also do it explicitly here. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary-50 p-2">
                <Truck size={18} className="text-primary-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-text-primary">
                    Ship-with-Xelnova Pickup Warehouse
                  </h2>
                  {xelgoWh?.registered && !xelgoWh?.addressDriftedSinceRegistration && (
                    <Badge variant="success" className="text-[10px] px-1.5 py-0">
                      Registered
                    </Badge>
                  )}
                  {xelgoWh?.registered && xelgoWh?.addressDriftedSinceRegistration && (
                    <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                      Address changed — re-register
                    </Badge>
                  )}
                  {!xelgoWh?.registered && xelgoWh?.readyToRegister && (
                    <Badge variant="info" className="text-[10px] px-1.5 py-0">
                      Ready to register
                    </Badge>
                  )}
                  {!xelgoWh?.readyToRegister && (
                    <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                      Profile incomplete
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  Xelnova registers your address as a dedicated warehouse with our courier partner so
                  pickups come straight to you — no need for you to log in to Delhivery&apos;s portal.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleRegisterXelgoWarehouse}
              loading={xelgoWhSaving}
              disabled={!xelgoWh || !xelgoWh.readyToRegister}
              variant={xelgoWh?.addressDriftedSinceRegistration ? 'primary' : 'outline'}
            >
              {xelgoWh?.registered ? 'Re-register' : 'Register now'}
            </Button>
          </div>

          {xelgoWhLoading && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 size={14} className="animate-spin" /> Checking warehouse status…
            </div>
          )}

          {!xelgoWhLoading && xelgoWh && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div>
                  <span className="text-text-muted">Warehouse name: </span>
                  <span className="font-mono font-medium text-text-primary">
                    {xelgoWh.warehouseName}
                  </span>
                </div>
                {xelgoWh.registeredAt && (
                  <div className="text-text-muted">
                    Registered {new Date(xelgoWh.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>

              <div className="text-text-muted">
                <span className="font-medium text-text-primary">Pickup address on file: </span>
                {xelgoWh.addressOnFile.address
                  ? `${xelgoWh.addressOnFile.address}, ${xelgoWh.addressOnFile.city}, ${xelgoWh.addressOnFile.state} – ${xelgoWh.addressOnFile.pincode}`
                  : <span className="italic">Not set — please complete your profile above.</span>}
                {xelgoWh.addressOnFile.phone && (
                  <span> · 📞 {xelgoWh.addressOnFile.phone}</span>
                )}
              </div>

              {xelgoWh.missingFields.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-800">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    Complete these fields before registering:&nbsp;
                    <strong>{xelgoWh.missingFields.join(', ')}</strong>.
                  </div>
                </div>
              )}

              {xelgoWh.addressDriftedSinceRegistration && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-800">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    Your pickup address has changed since you last registered.
                    Click <strong>Re-register</strong> so the courier picks up from your new location.
                  </div>
                </div>
              )}

              {xelgoWh.lastError && !xelgoWh.registered && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2 text-red-800">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    Last attempt failed: {xelgoWh.lastError}
                  </div>
                </div>
              )}

              {xelgoWh.registered && !xelgoWh.addressDriftedSinceRegistration && !xelgoWh.lastError && (
                <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 p-2 text-green-800">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  <div>
                    All set. Every Ship-with-Xelnova pickup will be collected from this address.
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Built-in option — only Ship By Own here. Xelgo (platform courier) is offered
            on the per-order ship page when the seller hands a paid order over to us. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gray-100 p-2">
                <Settings size={18} className="text-gray-500" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text-primary">Ship By Own</h3>
                  <Badge variant="info" className="text-[10px] px-1.5 py-0">No Setup</Badge>
                </div>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Ship with any courier you prefer. We won&apos;t charge any shipping or surcharge for self-shipped orders.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Third-party courier integrations */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link2 size={15} className="text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">Connect Your Courier Accounts</h2>
          </div>
          <p className="text-xs text-text-muted mb-4 ml-[23px]">
            Link your existing courier accounts to book shipments directly. Credentials are encrypted with AES-256.
          </p>

          <div className="grid gap-3">
            {PROVIDERS.map((provider, i) => {
              const config = getConfigForProvider(provider.id);
              const isConfigured = !!config;

              return (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className={`rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md ${
                    isConfigured ? 'border-green-200' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{provider.logo}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-text-primary">{provider.name}</h3>
                          {isConfigured ? (
                            <Badge variant="success" className="text-[10px] px-1.5 py-0">
                              <CheckCircle2 size={9} className="mr-0.5" />
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">Not Connected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{provider.tagline}</p>
                        {isConfigured && config.accountId && (
                          <p className="text-[11px] text-text-muted mt-1 truncate">
                            Account: <span className="font-medium text-text-secondary">{config.accountId}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isConfigured && (
                        <button
                          onClick={() => setDeleteConfirm(provider.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
                          title="Disconnect"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <Button
                        size="sm"
                        variant={isConfigured ? 'outline' : 'primary'}
                        onClick={() => openEditModal(provider.id)}
                        className="text-xs"
                      >
                        {isConfigured ? (
                          <>
                            <Edit2 size={12} />
                            Edit
                          </>
                        ) : (
                          <>
                            <Plus size={12} />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-primary-500" />
          </div>
        )}

        {/* Shipping Rate Chart */}
        {rates && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-5"
          >
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Xelgo Shipping Rate Chart</h2>
              <p className="text-xs text-text-muted mt-1">
                These rates apply when shipping via Xelgo (our platform courier). Final amount shown to customer includes everything (shipping + applicable surcharges) as a single line item.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-primary-50 px-4 py-2.5 border-b border-border">
                  <h3 className="text-xs font-bold text-primary-700">Weight-based Charges</h3>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-gray-50 text-text-muted">
                      <th className="px-4 py-2 text-left font-medium">Weight</th>
                      <th className="px-4 py-2 text-right font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.weightSlabs.map((slab, i) => {
                      const prev = i > 0 ? rates.weightSlabs[i - 1].upToKg : 0;
                      const label = i === rates.weightSlabs.length - 1 && slab.upToKg >= 50
                        ? `Above ${prev} kg`
                        : i === 0
                          ? `Up to ${slab.upToKg} kg`
                          : `${prev} – ${slab.upToKg} kg`;
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-2 text-text-secondary">{label}</td>
                          <td className="px-4 py-2 text-right font-semibold text-text-primary">₹{slab.rate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-accent-50 px-4 py-2.5 border-b border-border">
                  <h3 className="text-xs font-bold text-accent-700">Volumetric Surcharges</h3>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-gray-50 text-text-muted">
                      <th className="px-4 py-2 text-left font-medium">Volume (L×B×H)</th>
                      <th className="px-4 py-2 text-right font-medium">Surcharge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.dimensionSlabs.map((slab, i) => {
                      const prev = i > 0 ? rates.dimensionSlabs[i - 1].upToCm3 : 0;
                      const label = i === rates.dimensionSlabs.length - 1 && slab.upToCm3 >= 100000
                        ? `Above ${prev.toLocaleString('en-IN')} cm³`
                        : i === 0
                          ? `Up to ${slab.upToCm3.toLocaleString('en-IN')} cm³`
                          : `${prev.toLocaleString('en-IN')} – ${slab.upToCm3.toLocaleString('en-IN')} cm³`;
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-2 text-text-secondary">{label}</td>
                          <td className="px-4 py-2 text-right font-semibold text-text-primary">
                            {slab.rate === 0 ? 'Free' : `+₹${slab.rate}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[10px] text-text-muted">
              {/*
                Per testing observation #29 — for Xelgo orders we charge
                weight + volumetric + a flat 10% platform surcharge, and the
                final consolidated value is what's displayed everywhere
                (seller, customer statement). Self-shipped orders are not
                charged any platform shipping fee.
              */}
              Xelgo charge = (weight charge + volumetric surcharge) + 10% platform surcharge, billed as a single consolidated amount. Self-shipped orders are not charged any platform shipping fee. Rates are in {rates.baseCurrency} and subject to change.
            </p>
          </motion.div>
        )}

        {/* ── Need Help? Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-border bg-gradient-to-br from-gray-50 to-white p-5 space-y-4"
        >
          <div>
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <AlertCircle size={15} className="text-primary-500" />
              Need Help Connecting?
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Use the same credentials you use in your courier&apos;s dashboard. We only store them encrypted to book shipments for your orders.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Delhivery */}
            <div className="rounded-xl border border-border bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📦</span>
                <h3 className="text-xs font-semibold text-text-primary">Delhivery</h3>
              </div>
              <ul className="text-[11px] text-text-muted space-y-1 mb-2">
                <li>• Login → Settings → API Setup → Copy <strong>API Token</strong></li>
                <li>• Enter your exact <strong>Client Name</strong> (case-sensitive)</li>
                <li>• Go to Settings → Warehouses → Copy exact <strong>Pickup Location Name</strong></li>
              </ul>
              <a
                href="https://one.delhivery.com/home"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary-600 font-medium hover:underline"
              >
                <ExternalLink size={10} />
                Open Delhivery Dashboard
              </a>
            </div>

            {/* ShipRocket */}
            <div className="rounded-xl border border-border bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🚀</span>
                <h3 className="text-xs font-semibold text-text-primary">ShipRocket</h3>
              </div>
              <ul className="text-[11px] text-text-muted space-y-1 mb-2">
                <li>• Login → Settings → API</li>
                <li>• Create a new <strong>API User</strong> (separate email)</li>
                <li>• Use that email &amp; password here</li>
              </ul>
              <a
                href="https://app.shiprocket.in/newlogin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary-600 font-medium hover:underline"
              >
                <ExternalLink size={10} />
                Open ShipRocket Dashboard
              </a>
            </div>

            {/* XpressBees */}
            <div className="rounded-xl border border-border bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🐝</span>
                <h3 className="text-xs font-semibold text-text-primary">XpressBees</h3>
              </div>
              <ul className="text-[11px] text-text-muted space-y-1 mb-2">
                <li>• Use your XpressBees <strong>login email &amp; password</strong></li>
                <li>• Same credentials you use at shipment.xpressbees.com</li>
              </ul>
              <a
                href="https://shipment.xpressbees.com/dash"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary-600 font-medium hover:underline"
              >
                <ExternalLink size={10} />
                Open XpressBees Dashboard
              </a>
            </div>

            {/* Ekart */}
            <div className="rounded-xl border border-border bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📬</span>
                <h3 className="text-xs font-semibold text-text-primary">Ekart Elite</h3>
              </div>
              <ul className="text-[11px] text-text-muted space-y-1 mb-2">
                <li>• Login → Settings → API Documentation</li>
                <li>• Copy <strong>Client ID</strong>, <strong>Username</strong> &amp; <strong>Password</strong></li>
              </ul>
              <a
                href="https://app.elite.ekartlogistics.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary-600 font-medium hover:underline"
              >
                <ExternalLink size={10} />
                Open Ekart Dashboard
              </a>
            </div>
          </div>

          <p className="text-[10px] text-text-muted pt-2 border-t border-border">
            Still stuck? Contact our support team and we&apos;ll help you set up your courier integrations.
          </p>
        </motion.div>
      </div>

      {/* ── Connect / Edit Modal ── */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={existingConfig ? `Edit ${activeProvider?.name}` : `Connect ${activeProvider?.name}`}
        size="lg"
      >
        {activeProvider && (
          <div className="space-y-5">
            {/* How-to banner */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                <span className="font-semibold">How to connect:</span>{' '}
                {activeProvider.howToConnect}
              </p>
              <a
                href={activeProvider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium mt-1.5 hover:underline"
              >
                <ExternalLink size={11} />
                {activeProvider.docsLabel}
              </a>
            </div>

            {/* Update notice */}
            {existingConfig && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-start gap-2">
                <AlertCircle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Sensitive fields are masked. Enter new values to update, or leave blank to keep existing.
                </p>
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-4">
              {activeProvider.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="block text-xs font-medium text-text-primary">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <Input
                    type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    endIcon={
                      field.secret ? (
                        <button
                          type="button"
                          onClick={() =>
                            setShowSecrets((prev) => ({
                              ...prev,
                              [field.key]: !prev[field.key],
                            }))
                          }
                          className="text-text-muted hover:text-text-primary transition-colors"
                        >
                          {showSecrets[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      ) : undefined
                    }
                  />
                  {field.helpText && (
                    <p className="text-[11px] text-text-muted leading-snug">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Security note */}
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <Shield size={11} />
              All credentials are encrypted with AES-256 before storage.
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1 border-t border-border">
              <Button variant="outline" onClick={() => setEditModal(null)} size="sm">
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving} size="sm">
                <Check size={13} />
                {existingConfig ? 'Update' : 'Connect'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Disconnect Courier"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Disconnect{' '}
            <strong>{PROVIDERS.find((p) => p.id === deleteConfirm)?.name}</strong>?
            You won&apos;t be able to book shipments with this courier until you reconnect.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} size="sm">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              loading={saving}
              size="sm"
            >
              <Trash2 size={13} />
              Disconnect
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
