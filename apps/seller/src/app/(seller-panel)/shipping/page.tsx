'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Truck, Plus, Trash2, Edit2, Check, X, Eye, EyeOff,
  ExternalLink, Loader2, AlertCircle, CheckCircle2, Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button, Input, Modal, Badge } from '@xelnova/ui';
import {
  apiGetCourierConfigs,
  apiSaveCourierConfig,
  apiDeleteCourierConfig,
  apiGetShippingRates,
  type ShippingRates,
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

const PROVIDERS = [
  {
    id: 'DELHIVERY',
    name: 'Delhivery',
    description: 'One of India\'s largest logistics companies with pan-India coverage',
    logo: '📦',
    fields: [
      { key: 'apiKey', label: 'API Token', required: true, placeholder: 'Your Delhivery API token' },
      { key: 'accountId', label: 'Client Name', required: true, placeholder: 'Your Delhivery client name' },
      { key: 'warehouseId', label: 'Warehouse Name', required: false, placeholder: 'Pickup warehouse name' },
    ],
    docsUrl: 'https://www.delhivery.com/developers',
  },
  {
    id: 'SHIPROCKET',
    name: 'ShipRocket',
    description: 'Courier aggregator with 17+ courier partners and automated shipping',
    logo: '🚀',
    fields: [
      { key: 'accountId', label: 'API Email', required: true, placeholder: 'Your ShipRocket API user email' },
      { key: 'apiKey', label: 'API Password', required: true, placeholder: 'Your ShipRocket API user password', secret: true },
      { key: 'warehouseId', label: 'Pickup Location', required: false, placeholder: 'e.g. Primary' },
    ],
    docsUrl: 'https://apidocs.shiprocket.in',
  },
  {
    id: 'XPRESSBEES',
    name: 'XpressBees',
    description: 'Fast-growing logistics provider with same-day and next-day delivery',
    logo: '🐝',
    fields: [
      { key: 'apiKey', label: 'XB Access Key / API Key', required: true, placeholder: 'Your XpressBees access key' },
      { key: 'apiSecret', label: 'Password (for token auth)', required: false, placeholder: 'Leave empty for static key auth', secret: true },
      { key: 'accountId', label: 'Enterprise ID / Email', required: false, placeholder: 'Your enterprise ID' },
      { key: 'warehouseId', label: 'Warehouse Name', required: false, placeholder: 'Default pickup warehouse' },
    ],
    docsUrl: 'https://xbclientapi.xpressbees.com',
  },
  {
    id: 'EKART',
    name: 'Ekart',
    description: 'Flipkart\'s logistics arm with extensive reach across India',
    logo: '📬',
    fields: [
      { key: 'apiKey', label: 'API Key / Password', required: true, placeholder: 'Your Ekart API key', secret: true },
      { key: 'accountId', label: 'Merchant Code', required: true, placeholder: '3-character merchant code' },
      { key: 'warehouseId', label: 'Location Code', required: false, placeholder: 'Source location code' },
    ],
    docsUrl: null,
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

  const getConfigForProvider = (providerId: string) =>
    configs.find((c) => c.provider === providerId);

  const openEditModal = (providerId: string) => {
    const existing = getConfigForProvider(providerId);
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) return;

    const data: Record<string, string> = {};
    provider.fields.forEach((f) => {
      if (f.key === 'apiKey') data.apiKey = '';
      else if (f.key === 'apiSecret') data.apiSecret = '';
      else if (f.key === 'accountId') data.accountId = existing?.accountId || '';
      else if (f.key === 'warehouseId') data.warehouseId = existing?.warehouseId || '';
    });
    setFormData(data);
    setEditModal(providerId);
  };

  const handleSave = async () => {
    if (!editModal) return;
    const provider = PROVIDERS.find((p) => p.id === editModal);
    if (!provider) return;

    const requiredFields = provider.fields.filter((f) => f.required);
    for (const field of requiredFields) {
      if (!formData[field.key]?.trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setSaving(true);
    try {
      await apiSaveCourierConfig({
        provider: editModal,
        apiKey: formData.apiKey || '',
        apiSecret: formData.apiSecret || undefined,
        accountId: formData.accountId || undefined,
        warehouseId: formData.warehouseId || undefined,
        metadata: formData.metadata ? JSON.parse(formData.metadata) : undefined,
      });
      toast.success(`${provider.name} configuration saved`);
      setEditModal(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
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

  return (
    <>
      <DashboardHeader title="Shipping Settings" />
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Xelnova Courier info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary-100 p-2.5">
              <Truck size={20} className="text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-text-primary">Xelnova Courier</h3>
              <p className="text-xs text-text-muted mt-1">
                Always available. When you choose Xelnova Courier for an order, we handle everything — pickup, delivery, AWB generation, and status updates. No configuration needed.
              </p>
              <Badge variant="success" className="mt-2">
                <CheckCircle2 size={10} className="mr-0.5" />
                Always Active
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Self-ship info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-white p-5"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gray-100 p-2.5">
              <Settings size={20} className="text-gray-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Ship By Own</h3>
              <p className="text-xs text-text-muted mt-1">
                Ship orders yourself using any courier. You&apos;ll need to manually enter the AWB number and update the delivery status.
              </p>
              <Badge variant="info" className="mt-2">No Setup Required</Badge>
            </div>
          </div>
        </motion.div>

        {/* Courier providers */}
        <div>
          <h2 className="text-sm font-bold text-text-primary mb-3">Courier API Integrations</h2>
          <p className="text-xs text-text-muted mb-4">
            Connect your courier accounts to book shipments directly from your dashboard. Your API keys are encrypted and stored securely.
          </p>

          <div className="grid gap-4">
            {PROVIDERS.map((provider, i) => {
              const config = getConfigForProvider(provider.id);
              const isConfigured = !!config;

              return (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{provider.logo}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-text-primary">{provider.name}</h3>
                          {isConfigured ? (
                            <Badge variant={config.isActive ? 'success' : 'warning'}>
                              {config.isActive ? 'Connected' : 'Inactive'}
                            </Badge>
                          ) : (
                            <Badge variant="default">Not Configured</Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-1">{provider.description}</p>
                        {isConfigured && (
                          <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                            <span>API Key: {config.apiKey}</span>
                            {config.accountId && <span>Account: {config.accountId}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.docsUrl && (
                        <a
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg border border-border hover:bg-gray-50 text-text-muted hover:text-text-primary transition-colors"
                          title="API Docs"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {isConfigured && (
                        <button
                          onClick={() => setDeleteConfirm(provider.id)}
                          className="p-2 rounded-lg border border-border hover:bg-red-50 text-text-muted hover:text-red-600 transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <Button
                        size="sm"
                        variant={isConfigured ? 'outline' : 'primary'}
                        onClick={() => openEditModal(provider.id)}
                      >
                        {isConfigured ? (
                          <>
                            <Edit2 size={13} />
                            Edit
                          </>
                        ) : (
                          <>
                            <Plus size={13} />
                            Configure
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
              <h2 className="text-sm font-bold text-text-primary">Xelnova Shipping Rate Chart</h2>
              <p className="text-xs text-text-muted mt-1">
                These rates are set by the platform and apply when shipping via Xelnova Courier.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Weight-based rates */}
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

              {/* Dimension surcharges */}
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
              Total shipping cost = weight charge + volumetric surcharge. Rates are in {rates.baseCurrency} and subject to change.
            </p>
          </motion.div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={`Configure ${PROVIDERS.find((p) => p.id === editModal)?.name || ''}`}
        size="lg"
      >
        {editModal && (() => {
          const provider = PROVIDERS.find((p) => p.id === editModal)!;
          const existing = getConfigForProvider(editModal);
          return (
            <div className="space-y-4">
              {existing && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Existing keys are masked. Enter new values to update them, or leave blank to keep current keys.
                  </p>
                </div>
              )}
              {provider.fields.map((field) => (
                <div key={field.key}>
                  <Input
                    label={field.label + (field.required ? ' *' : '')}
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
                          className="text-text-muted hover:text-text-primary"
                        >
                          {showSecrets[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      ) : undefined
                    }
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditModal(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={saving}>
                  <Check size={14} />
                  {existing ? 'Update' : 'Save'} Configuration
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove Configuration"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to remove the{' '}
            <strong>{PROVIDERS.find((p) => p.id === deleteConfirm)?.name}</strong>{' '}
            configuration? You won&apos;t be able to book shipments with this courier until you reconfigure it.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              loading={saving}
            >
              <Trash2 size={14} />
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
