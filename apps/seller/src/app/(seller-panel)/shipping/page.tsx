'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Plus, Trash2, Edit2, Check, Eye, EyeOff,
  ExternalLink, Loader2, AlertCircle, CheckCircle2, Settings,
  Shield, Link2, MapPin, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button, Input, Modal, Badge } from '@xelnova/ui';
import {
  apiGetCourierConfigs,
  apiSaveCourierConfig,
  apiDeleteCourierConfig,
  apiGetShippingRates,
  apiListPickupLocations,
  apiCreatePickupLocation,
  apiUpdatePickupLocation,
  apiDeletePickupLocation,
  apiSetDefaultPickupLocation,
  apiRegisterPickupLocation,
  type ShippingRates,
  type SellerPickupLocation,
  type CreatePickupLocationPayload,
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

  // ─── Pickup Locations (multi-warehouse) ───
  // Each seller can register N pickup addresses with the carrier. One
  // is the default (used when the seller doesn't pick one explicitly
  // on the Ship modal). Each location maps to its own warehouse on
  // Delhivery, so the rider routes to the correct address per shipment.
  const [locations, setLocations] = useState<SellerPickupLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationModal, setLocationModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; location: SellerPickupLocation }
    | null
  >(null);
  const [locationDeleteConfirm, setLocationDeleteConfirm] = useState<SellerPickupLocation | null>(
    null,
  );
  const [locationActionId, setLocationActionId] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    setLocationsLoading(true);
    try {
      const data = await apiListPickupLocations();
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load pickup locations', err);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  const handleSetDefaultLocation = async (location: SellerPickupLocation) => {
    if (location.isDefault) return;
    setLocationActionId(location.id);
    try {
      await apiSetDefaultPickupLocation(location.id);
      toast.success(`"${location.label}" is now your default pickup location.`);
      await loadLocations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default');
    } finally {
      setLocationActionId(null);
    }
  };

  const handleReregisterLocation = async (location: SellerPickupLocation) => {
    setLocationActionId(location.id);
    try {
      const updated = await apiRegisterPickupLocation(location.id);
      toast.success(
        updated.lastError
          ? `Carrier rejected: ${updated.lastError}`
          : `Pickup location "${updated.label}" registered.`,
      );
      await loadLocations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register location');
    } finally {
      setLocationActionId(null);
    }
  };

  const handleDeleteLocation = async (location: SellerPickupLocation) => {
    setLocationActionId(location.id);
    try {
      await apiDeletePickupLocation(location.id);
      toast.success(`Pickup location "${location.label}" deleted.`);
      setLocationDeleteConfirm(null);
      await loadLocations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete location');
    } finally {
      setLocationActionId(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [configsRes, ratesRes] = await Promise.allSettled([
        apiGetCourierConfigs(),
        apiGetShippingRates(),
      ]);
      setConfigs(configsRes.status === 'fulfilled' && Array.isArray(configsRes.value) ? configsRes.value : []);
      if (ratesRes.status === 'fulfilled') setRates(ratesRes.value);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadLocations(); }, [loadLocations]);

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

        {/* Pickup Locations (multi-warehouse).
            Each address here gets its own warehouse on the carrier
            (Delhivery), so the rider routes correctly per shipment.
            One location is the default — used when a seller doesn't
            pick a specific one on the per-order Ship modal. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary-50 p-2">
                <MapPin size={18} className="text-primary-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Pickup Locations</h2>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  Add one or more addresses our rider can pick from. Each address is registered as
                  its own warehouse with the courier — when you ship an order you can choose which
                  pickup location it leaves from.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setLocationModal({ mode: 'create' })}>
              <Plus size={12} /> Add location
            </Button>
          </div>

          {locationsLoading && (
            <div className="flex items-center gap-2 text-xs text-text-muted py-3">
              <Loader2 size={14} className="animate-spin" /> Loading your pickup locations…
            </div>
          )}

          {!locationsLoading && locations.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <MapPin size={20} className="mx-auto text-gray-400" />
              <p className="text-sm font-medium text-text-primary mt-2">No pickup locations yet</p>
              <p className="text-xs text-text-muted mt-1">
                Add at least one address so the courier knows where to come for pickups.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setLocationModal({ mode: 'create' })}
              >
                <Plus size={12} /> Add your first location
              </Button>
            </div>
          )}

          {!locationsLoading && locations.length > 0 && (
            <div className="space-y-3">
              {locations.map((loc) => {
                const busy = locationActionId === loc.id;
                return (
                  <div
                    key={loc.id}
                    className={`rounded-xl border p-3 ${
                      loc.isDefault ? 'border-primary-300 bg-primary-50/40' : 'border-border bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-text-primary truncate">
                            {loc.label}
                          </h3>
                          {loc.isDefault && (
                            <Badge variant="info" className="text-[10px] px-1.5 py-0">
                              <Star size={9} className="mr-0.5 fill-current" /> Default
                            </Badge>
                          )}
                          {loc.registered && !loc.addressDriftedSinceRegistration && (
                            <Badge variant="success" className="text-[10px] px-1.5 py-0">
                              <CheckCircle2 size={9} className="mr-0.5" /> Registered
                            </Badge>
                          )}
                          {loc.registered && loc.addressDriftedSinceRegistration && (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                              Address changed
                            </Badge>
                          )}
                          {!loc.registered && loc.lastError && (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                              Not registered
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          {loc.addressLine}, {loc.city}, {loc.state} – {loc.pincode}
                          {loc.phone && <span className="ml-1">· 📞 {loc.phone}</span>}
                        </p>
                        {loc.warehouseName && (
                          <p className="text-[11px] text-text-muted mt-1">
                            Warehouse name: <span className="font-mono">{loc.warehouseName}</span>
                            {loc.registeredAt && (
                              <span className="ml-1">
                                · Registered{' '}
                                {new Date(loc.registeredAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </p>
                        )}
                        {loc.addressDriftedSinceRegistration && (
                          <div className="flex items-start gap-2 mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
                            <AlertCircle size={12} className="shrink-0 mt-0.5" />
                            <span>
                              The address changed after registration — click <strong>Re-register</strong>{' '}
                              so the courier picks from the new address.
                            </span>
                          </div>
                        )}
                        {loc.lastError && !loc.registered && (
                          <div className="flex items-start gap-2 mt-2 rounded-lg bg-red-50 border border-red-200 p-2 text-[11px] text-red-800">
                            <AlertCircle size={12} className="shrink-0 mt-0.5" />
                            <span>Carrier rejected: {loc.lastError}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <button
                          onClick={() => setLocationModal({ mode: 'edit', location: loc })}
                          disabled={busy}
                          className="rounded-md p-1.5 text-text-muted hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setLocationDeleteConfirm(loc)}
                          disabled={busy}
                          className="rounded-md p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {!loc.isDefault && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetDefaultLocation(loc)}
                          loading={busy}
                        >
                          <Star size={12} /> Make default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={loc.addressDriftedSinceRegistration || !loc.registered ? 'primary' : 'outline'}
                        onClick={() => handleReregisterLocation(loc)}
                        loading={busy}
                      >
                        <Truck size={12} />
                        {loc.registered ? 'Re-register' : 'Register with carrier'}
                      </Button>
                    </div>
                  </div>
                );
              })}
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

      {/* ── Pickup Location: Create / Edit Modal ── */}
      <PickupLocationFormModal
        state={locationModal}
        onClose={() => setLocationModal(null)}
        onSaved={async () => {
          setLocationModal(null);
          await loadLocations();
        }}
      />

      {/* ── Pickup Location: Delete Confirmation ── */}
      <Modal
        open={!!locationDeleteConfirm}
        onClose={() => setLocationDeleteConfirm(null)}
        title="Delete pickup location"
        size="sm"
      >
        {locationDeleteConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Delete <strong>&ldquo;{locationDeleteConfirm.label}&rdquo;</strong>?
              {locationDeleteConfirm.isDefault && (
                <span className="block mt-2 text-amber-700">
                  This is your <strong>default</strong> pickup location. After deletion, the
                  oldest remaining location will become the new default.
                </span>
              )}
              <span className="block mt-2 text-xs text-text-muted">
                Shipments already booked from this address keep working — only future bookings are
                affected. The carrier-side warehouse is left in place; if you re-add the same
                address later, we&apos;ll reuse it.
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setLocationDeleteConfirm(null)}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeleteLocation(locationDeleteConfirm)}
                loading={locationActionId === locationDeleteConfirm.id}
                size="sm"
              >
                <Trash2 size={13} />
                Delete location
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ─── Pickup Location Form Modal ───
//
// One small component, used for both Create and Edit. Keeps the parent
// page's JSX focused on the list view.

type PickupLocationModalState =
  | { mode: 'create' }
  | { mode: 'edit'; location: SellerPickupLocation }
  | null;

function PickupLocationFormModal({
  state,
  onClose,
  onSaved,
}: {
  state: PickupLocationModalState;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const isEdit = state?.mode === 'edit';
  const [form, setForm] = useState<CreatePickupLocationPayload>({
    label: '',
    contactPerson: '',
    phone: '',
    email: '',
    addressLine: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    makeDefault: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state) return;
    if (state.mode === 'edit') {
      const l = state.location;
      setForm({
        label: l.label,
        contactPerson: l.contactPerson || '',
        phone: l.phone,
        email: l.email || '',
        addressLine: l.addressLine,
        city: l.city,
        state: l.state,
        country: l.country || 'India',
        pincode: l.pincode,
        makeDefault: l.isDefault,
      });
    } else {
      setForm({
        label: '',
        contactPerson: '',
        phone: '',
        email: '',
        addressLine: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        makeDefault: false,
      });
    }
  }, [state]);

  const handleSubmit = async () => {
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!form.label.trim()) return toast.error('Give this location a label');
    if (!form.addressLine.trim()) return toast.error('Address line is required');
    if (!form.city.trim()) return toast.error('City is required');
    if (!form.state.trim()) return toast.error('State is required');
    if (!/^\d{6}$/.test(form.pincode.trim())) return toast.error('Pincode must be 6 digits');
    if (phoneDigits.length < 10) return toast.error('Enter a 10-digit pickup phone');

    setSaving(true);
    try {
      if (isEdit && state?.mode === 'edit') {
        await apiUpdatePickupLocation(state.location.id, {
          label: form.label.trim(),
          contactPerson: form.contactPerson?.trim(),
          phone: phoneDigits,
          email: form.email?.trim(),
          addressLine: form.addressLine.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          country: form.country?.trim() || 'India',
          pincode: form.pincode.trim(),
        });
        toast.success(`"${form.label}" updated. Re-registering with the carrier…`);
      } else {
        await apiCreatePickupLocation({
          ...form,
          phone: phoneDigits,
          label: form.label.trim(),
          addressLine: form.addressLine.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
        });
        toast.success(`"${form.label}" added. Registering with the carrier…`);
      }
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save pickup location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={isEdit ? 'Edit pickup location' : 'Add pickup location'}
      size="lg"
    >
      <div className="space-y-4">
        <Input
          label="Label"
          placeholder="e.g. Main warehouse, Festival overflow"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Contact person"
            placeholder="Name of the person at this address"
            value={form.contactPerson || ''}
            onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
          />
          <Input
            label="Pickup phone"
            placeholder="10-digit mobile"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <Input
          label="Email (optional)"
          placeholder="Pickup point email"
          value={form.email || ''}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <Input
          label="Address line"
          placeholder="Building / street / area"
          value={form.addressLine}
          onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="City"
            placeholder="e.g. Mumbai"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
          <Input
            label="State"
            placeholder="e.g. Maharashtra"
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
          />
          <Input
            label="Pincode"
            placeholder="6-digit"
            value={form.pincode}
            onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
          />
        </div>
        {!isEdit && (
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={!!form.makeDefault}
              onChange={(e) => setForm((f) => ({ ...f, makeDefault: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Make this my default pickup location
          </label>
        )}
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-[11px] text-blue-700">
          We&apos;ll register this address with our courier partner (Delhivery) automatically. You
          can come back here to re-register if the address changes later.
        </div>
        <div className="flex justify-end gap-2 pt-1 border-t border-border">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving} size="sm">
            <Check size={13} />
            {isEdit ? 'Save changes' : 'Add location'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
