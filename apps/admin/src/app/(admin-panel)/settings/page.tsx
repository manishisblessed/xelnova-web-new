'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { FormField, FormInput, FormSelect, FormToggle } from '@/components/dashboard/form-field';
import { Save, Plus, Trash2 } from 'lucide-react';
import { apiGet, apiPatchSiteSettings } from '@/lib/api';
import { toast } from 'sonner';

interface WeightSlab { upToKg: number; rate: number }
interface DimensionSlab { upToCm3: number; rate: number }

interface Settings {
  general: { siteName: string; tagline: string; currency: string; timezone: string; language: string };
  tax: { gstEnabled: boolean; gstRate: number; hsnDefault: string };
  shipping: { freeShippingMin: number; defaultRate: number; expressRate: number; codEnabled: boolean; codFee: number };
  payment: { razorpayEnabled: boolean; codEnabled: boolean; upiEnabled: boolean; cardEnabled: boolean; netBankingEnabled: boolean };
  notifications: { orderConfirmation: boolean; shipmentUpdate: boolean; promotionalEmails: boolean; smsAlerts: boolean; adminNewOrder: boolean };
  shippingLabel: { companyName: string; companyLogo: string; companyAddress: string; companyPhone: string; companyGstin: string; tagline: string; footerText: string; showSellerSignature: boolean; showBarcode: boolean };
  shippingRates: { weightSlabs: WeightSlab[]; dimensionSlabs: DimensionSlab[]; baseCurrency: string };
  returnPolicy: {
    isCancellable: boolean;
    isReturnable: boolean;
    isReplaceable: boolean;
    returnWindow: number;
    cancellationWindow: number;
  };
  productAttributePresets?: Record<
    string,
    { id: string; keys: string[]; valuesByKey: Record<string, string[]>; defaultValues: string[] }
  >;
  platformLogistics?: {
    xelnovaBackend?: XelgoBackend;
    delhivery?: {
      clientName?: string;
      warehouseName?: string;
      environment?: 'production' | 'staging';
      sellerGstin?: string;
      shippingMode?: 'Surface' | 'Express';
      apiToken?: string;
      apiTokenHint?: string;
    };
    shiprocket?: {
      email?: string;
      pickupLocation?: string;
      password?: string;
      passwordHint?: string;
    };
    xpressbees?: {
      email?: string;
      warehouseName?: string;
      businessName?: string;
      password?: string;
      passwordHint?: string;
    };
    ekart?: {
      clientId?: string;
      username?: string;
      pickupAlias?: string;
      password?: string;
      passwordHint?: string;
    };
  };
}

type XelgoBackend = 'delhivery' | 'shiprocket' | 'xpressbees' | 'ekart';

const XELGO_BACKENDS: { value: XelgoBackend; label: string; tagline: string }[] = [
  { value: 'delhivery', label: 'Delhivery', tagline: 'Recommended — pan-India coverage, prepaid + COD' },
  { value: 'ekart', label: 'Ekart Logistics', tagline: 'Flipkart\u2019s logistics arm — strong in metros & tier-2' },
  { value: 'xpressbees', label: 'XpressBees', tagline: 'Same-day & next-day in 50+ cities' },
  { value: 'shiprocket', label: 'ShipRocket', tagline: 'Aggregator with 17+ courier partners' },
];

function SettingsSection({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-2xl border border-border bg-surface shadow-card p-6 space-y-4">
      <h3 className="text-base font-semibold text-text-primary font-display">{title}</h3>
      {children}
    </motion.div>
  );
}

export default function SettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [presetsJson, setPresetsJson] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const d = await apiGet<Settings>('settings');
      setData(d);
      setPresetsJson(JSON.stringify(d.productAttributePresets ?? {}, null, 2));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!data) return;
    let productAttributePresets: Settings['productAttributePresets'];
    try {
      productAttributePresets = JSON.parse(presetsJson) as Settings['productAttributePresets'];
    } catch {
      toast.error('Product attribute presets: invalid JSON');
      return;
    }
    try {
      setSaving(true);
      const pl = data.platformLogistics;
      const platformLogistics =
        pl != null
          ? {
              xelnovaBackend: (pl.xelnovaBackend ?? 'delhivery') as XelgoBackend,
              delhivery: {
                clientName: pl.delhivery?.clientName ?? '',
                warehouseName: pl.delhivery?.warehouseName ?? '',
                environment: pl.delhivery?.environment ?? 'production',
                sellerGstin: pl.delhivery?.sellerGstin ?? '',
                shippingMode: pl.delhivery?.shippingMode ?? 'Surface',
                ...(pl.delhivery?.apiToken?.trim() ? { apiToken: pl.delhivery.apiToken.trim() } : {}),
              },
              shiprocket: {
                email: pl.shiprocket?.email ?? '',
                pickupLocation: pl.shiprocket?.pickupLocation ?? '',
                ...(pl.shiprocket?.password?.trim() ? { password: pl.shiprocket.password.trim() } : {}),
              },
              xpressbees: {
                email: pl.xpressbees?.email ?? '',
                warehouseName: pl.xpressbees?.warehouseName ?? '',
                businessName: pl.xpressbees?.businessName ?? '',
                ...(pl.xpressbees?.password?.trim() ? { password: pl.xpressbees.password.trim() } : {}),
              },
              ekart: {
                clientId: pl.ekart?.clientId ?? '',
                username: pl.ekart?.username ?? '',
                pickupAlias: pl.ekart?.pickupAlias ?? '',
                ...(pl.ekart?.password?.trim() ? { password: pl.ekart.password.trim() } : {}),
              },
            }
          : undefined;
      await apiPatchSiteSettings({
        ...data,
        productAttributePresets,
        ...(platformLogistics ? { platformLogistics } : {}),
      } as unknown as Record<string, unknown>);
      toast.success('Settings saved');
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <>
      <DashboardHeader title="Settings" />
      <div className="p-6 space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-surface-muted animate-pulse" />)}</div>
    </>
  );

  if (!data) return null;

  return (
    <>
      <DashboardHeader title="Settings" />
      <div className="p-6 space-y-6 max-w-4xl">
        <SettingsSection title="General" delay={0}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Site Name"><FormInput value={data.general.siteName} onChange={e => setData(d => d ? { ...d, general: { ...d.general, siteName: e.target.value } } : null)} /></FormField>
            <FormField label="Tagline"><FormInput value={data.general.tagline} onChange={e => setData(d => d ? { ...d, general: { ...d.general, tagline: e.target.value } } : null)} /></FormField>
            <FormField label="Currency"><FormSelect value={data.general.currency} onChange={e => setData(d => d ? { ...d, general: { ...d.general, currency: e.target.value } } : null)}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></FormSelect></FormField>
            <FormField label="Timezone"><FormInput value={data.general.timezone} readOnly /></FormField>
          </div>
        </SettingsSection>

        <SettingsSection title="Tax" delay={0.05}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormToggle label="Enable GST" checked={data.tax.gstEnabled} onChange={v => setData(d => d ? { ...d, tax: { ...d.tax, gstEnabled: v } } : null)} />
            <FormField label="GST Rate (%)"><FormInput type="number" value={data.tax.gstRate} onChange={e => setData(d => d ? { ...d, tax: { ...d.tax, gstRate: +e.target.value } } : null)} /></FormField>
            <FormField label="Default HSN Code"><FormInput value={data.tax.hsnDefault} onChange={e => setData(d => d ? { ...d, tax: { ...d.tax, hsnDefault: e.target.value } } : null)} /></FormField>
          </div>
        </SettingsSection>

        <SettingsSection title="Shipping" delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Free Shipping Min (₹)"><FormInput type="number" value={data.shipping.freeShippingMin} onChange={e => setData(d => d ? { ...d, shipping: { ...d.shipping, freeShippingMin: +e.target.value } } : null)} /></FormField>
            <FormField label="Default Rate (₹)"><FormInput type="number" value={data.shipping.defaultRate} onChange={e => setData(d => d ? { ...d, shipping: { ...d.shipping, defaultRate: +e.target.value } } : null)} /></FormField>
            <FormField label="Express Rate (₹)"><FormInput type="number" value={data.shipping.expressRate} onChange={e => setData(d => d ? { ...d, shipping: { ...d.shipping, expressRate: +e.target.value } } : null)} /></FormField>
            <FormToggle label="Enable COD" checked={data.shipping.codEnabled} onChange={v => setData(d => d ? { ...d, shipping: { ...d.shipping, codEnabled: v } } : null)} />
            <FormField label="COD Fee (₹)"><FormInput type="number" value={data.shipping.codFee} onChange={e => setData(d => d ? { ...d, shipping: { ...d.shipping, codFee: +e.target.value } } : null)} /></FormField>
          </div>
        </SettingsSection>

        <SettingsSection title="Platform logistics (Xelgo — Ship with Xelnova)" delay={0.12}>
          <p className="text-xs text-text-muted -mt-2 mb-3">
            Pick which carrier handles shipments booked through <strong>Ship with Xelnova</strong> and
            paste the credentials below. Sellers won&apos;t need to wire up their own courier accounts to use
            Xelgo — the platform fronts the booking.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Xelgo fulfilment backend">
              <FormSelect
                value={data.platformLogistics?.xelnovaBackend ?? 'delhivery'}
                onChange={(e) =>
                  setData((d) =>
                    d
                      ? {
                          ...d,
                          platformLogistics: {
                            ...d.platformLogistics,
                            xelnovaBackend: e.target.value as XelgoBackend,
                          },
                        }
                      : null,
                  )
                }
              >
                {XELGO_BACKENDS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </FormSelect>
            </FormField>
            <div className="self-end pb-1">
              <p className="text-xs text-text-muted">
                {XELGO_BACKENDS.find((b) => b.value === (data.platformLogistics?.xelnovaBackend ?? 'delhivery'))?.tagline}
              </p>
            </div>
          </div>

          {(data.platformLogistics?.xelnovaBackend ?? 'delhivery') === 'delhivery' && (
            <PlatformLogisticsDelhivery data={data} setData={setData} />
          )}
          {data.platformLogistics?.xelnovaBackend === 'shiprocket' && (
            <PlatformLogisticsShipRocket data={data} setData={setData} />
          )}
          {data.platformLogistics?.xelnovaBackend === 'xpressbees' && (
            <PlatformLogisticsXpressBees data={data} setData={setData} />
          )}
          {data.platformLogistics?.xelnovaBackend === 'ekart' && (
            <PlatformLogisticsEkart data={data} setData={setData} />
          )}
        </SettingsSection>

        <SettingsSection title="Payment Methods" delay={0.15}>
          <div className="space-y-3">
            <FormToggle label="Razorpay" checked={data.payment.razorpayEnabled} onChange={v => setData(d => d ? { ...d, payment: { ...d.payment, razorpayEnabled: v } } : null)} />
            <FormToggle label="UPI" checked={data.payment.upiEnabled} onChange={v => setData(d => d ? { ...d, payment: { ...d.payment, upiEnabled: v } } : null)} />
            <FormToggle label="Credit / Debit Cards" checked={data.payment.cardEnabled} onChange={v => setData(d => d ? { ...d, payment: { ...d.payment, cardEnabled: v } } : null)} />
            <FormToggle label="Net Banking" checked={data.payment.netBankingEnabled} onChange={v => setData(d => d ? { ...d, payment: { ...d.payment, netBankingEnabled: v } } : null)} />
            <FormToggle label="Cash on Delivery" checked={data.payment.codEnabled} onChange={v => setData(d => d ? { ...d, payment: { ...d.payment, codEnabled: v } } : null)} />
          </div>
        </SettingsSection>

        <SettingsSection title="Notifications" delay={0.2}>
          <div className="space-y-3">
            <FormToggle label="Order Confirmation Email" checked={data.notifications.orderConfirmation} onChange={v => setData(d => d ? { ...d, notifications: { ...d.notifications, orderConfirmation: v } } : null)} />
            <FormToggle label="Shipment Update SMS" checked={data.notifications.shipmentUpdate} onChange={v => setData(d => d ? { ...d, notifications: { ...d.notifications, shipmentUpdate: v } } : null)} />
            <FormToggle label="Promotional Emails" checked={data.notifications.promotionalEmails} onChange={v => setData(d => d ? { ...d, notifications: { ...d.notifications, promotionalEmails: v } } : null)} />
            <FormToggle label="SMS Alerts" checked={data.notifications.smsAlerts} onChange={v => setData(d => d ? { ...d, notifications: { ...d.notifications, smsAlerts: v } } : null)} />
            <FormToggle label="Admin New Order Alert" checked={data.notifications.adminNewOrder} onChange={v => setData(d => d ? { ...d, notifications: { ...d.notifications, adminNewOrder: v } } : null)} />
          </div>
        </SettingsSection>

        <SettingsSection title="Shipping Label / Packing Slip" delay={0.25}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Company Name"><FormInput value={data.shippingLabel.companyName} onChange={e => setData(d => d ? { ...d, shippingLabel: { ...d.shippingLabel, companyName: e.target.value } } : null)} /></FormField>
            <FormField label="Company Logo URL"><FormInput value={data.shippingLabel.companyLogo} onChange={e => setData(d => d ? { ...d, shippingLabel: { ...d.shippingLabel, companyLogo: e.target.value } } : null)} placeholder="https://res.cloudinary.com/..." /></FormField>
            <FormField label="Company Phone"><FormInput value={data.shippingLabel.companyPhone} onChange={e => setData(d => d ? { ...d, shippingLabel: { ...d.shippingLabel, companyPhone: e.target.value } } : null)} /></FormField>
            <FormField label="Company GSTIN"><FormInput value={data.shippingLabel.companyGstin} onChange={e => setData(d => d ? { ...d, shippingLabel: { ...d.shippingLabel, companyGstin: e.target.value } } : null)} /></FormField>
            <div className="sm:col-span-2"><FormField label="Company Address"><FormInput value={data.shippingLabel.companyAddress} onChange={e => setData(d => d ? { ...d, shippingLabel: { ...d.shippingLabel, companyAddress: e.target.value } } : null)} /></FormField></div>
            <div className="sm:col-span-2"><FormField label="Tagline"><FormInput value={data.shippingLabel.tagline} onChange={e => setData(d => d ? { ...d, shippingLabel: { ...d.shippingLabel, tagline: e.target.value } } : null)} placeholder="e.g. Your trusted marketplace" /></FormField></div>
            <div className="sm:col-span-2"><FormField label="Footer Text"><FormInput value={data.shippingLabel.footerText} onChange={e => setData(d => d ? { ...d, shippingLabel: { ...d.shippingLabel, footerText: e.target.value } } : null)} placeholder="e.g. Thank you for shopping with us!" /></FormField></div>
            <FormToggle label="Show Seller Signature Area" checked={data.shippingLabel.showSellerSignature} onChange={v => setData(d => d ? { ...d, shippingLabel: { ...d.shippingLabel, showSellerSignature: v } } : null)} />
            <FormToggle label="Show Barcode" checked={data.shippingLabel.showBarcode} onChange={v => setData(d => d ? { ...d, shippingLabel: { ...d.shippingLabel, showBarcode: v } } : null)} />
          </div>
        </SettingsSection>

        <SettingsSection title="Shipping Rate Chart" delay={0.3}>
          <p className="text-xs text-text-muted -mt-2">
            Define weight-based shipping charges and volumetric surcharges. Sellers will see these rates on their Shipping page.
          </p>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary">Weight-based Rates</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="pb-2 pr-3 font-medium">Up to (kg)</th>
                    <th className="pb-2 pr-3 font-medium">Rate (₹)</th>
                    <th className="pb-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {(data.shippingRates?.weightSlabs ?? []).map((slab, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 pr-3">
                        <FormInput
                          type="number"
                          min={0}
                          step="0.1"
                          value={slab.upToKg}
                          onChange={e => setData(d => {
                            if (!d) return null;
                            const slabs = [...(d.shippingRates?.weightSlabs ?? [])];
                            slabs[i] = { ...slabs[i], upToKg: +e.target.value };
                            return { ...d, shippingRates: { ...d.shippingRates, weightSlabs: slabs } };
                          })}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <FormInput
                          type="number"
                          min={0}
                          value={slab.rate}
                          onChange={e => setData(d => {
                            if (!d) return null;
                            const slabs = [...(d.shippingRates?.weightSlabs ?? [])];
                            slabs[i] = { ...slabs[i], rate: +e.target.value };
                            return { ...d, shippingRates: { ...d.shippingRates, weightSlabs: slabs } };
                          })}
                        />
                      </td>
                      <td className="py-1.5">
                        <button
                          type="button"
                          onClick={() => setData(d => {
                            if (!d) return null;
                            const slabs = (d.shippingRates?.weightSlabs ?? []).filter((_, j) => j !== i);
                            return { ...d, shippingRates: { ...d.shippingRates, weightSlabs: slabs } };
                          })}
                          className="rounded p-1 text-text-muted hover:text-danger-600 hover:bg-danger-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setData(d => {
                if (!d) return null;
                const slabs = [...(d.shippingRates?.weightSlabs ?? []), { upToKg: 0, rate: 0 }];
                return { ...d, shippingRates: { ...d.shippingRates, weightSlabs: slabs } };
              })}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              <Plus size={14} /> Add weight slab
            </button>
          </div>

          <hr className="border-border" />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-text-primary">Volumetric / Dimension Surcharges</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="pb-2 pr-3 font-medium">Up to (cm³)</th>
                    <th className="pb-2 pr-3 font-medium">Surcharge (₹)</th>
                    <th className="pb-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {(data.shippingRates?.dimensionSlabs ?? []).map((slab, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 pr-3">
                        <FormInput
                          type="number"
                          min={0}
                          value={slab.upToCm3}
                          onChange={e => setData(d => {
                            if (!d) return null;
                            const slabs = [...(d.shippingRates?.dimensionSlabs ?? [])];
                            slabs[i] = { ...slabs[i], upToCm3: +e.target.value };
                            return { ...d, shippingRates: { ...d.shippingRates, dimensionSlabs: slabs } };
                          })}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <FormInput
                          type="number"
                          min={0}
                          value={slab.rate}
                          onChange={e => setData(d => {
                            if (!d) return null;
                            const slabs = [...(d.shippingRates?.dimensionSlabs ?? [])];
                            slabs[i] = { ...slabs[i], rate: +e.target.value };
                            return { ...d, shippingRates: { ...d.shippingRates, dimensionSlabs: slabs } };
                          })}
                        />
                      </td>
                      <td className="py-1.5">
                        <button
                          type="button"
                          onClick={() => setData(d => {
                            if (!d) return null;
                            const slabs = (d.shippingRates?.dimensionSlabs ?? []).filter((_, j) => j !== i);
                            return { ...d, shippingRates: { ...d.shippingRates, dimensionSlabs: slabs } };
                          })}
                          className="rounded p-1 text-text-muted hover:text-danger-600 hover:bg-danger-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setData(d => {
                if (!d) return null;
                const slabs = [...(d.shippingRates?.dimensionSlabs ?? []), { upToCm3: 0, rate: 0 }];
                return { ...d, shippingRates: { ...d.shippingRates, dimensionSlabs: slabs } };
              })}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              <Plus size={14} /> Add dimension slab
            </button>
          </div>
        </SettingsSection>

        <SettingsSection title="Product attribute presets (seller inventory)" delay={0.31}>
          <p className="text-xs text-text-muted -mt-2 mb-3">
            Defines dropdown keys and allowed values for <strong>Features &amp; Specs</strong>,{' '}
            <strong>Materials &amp; Care</strong>, <strong>Item Details</strong>, and{' '}
            <strong>Additional Details</strong> on the seller product form. Sellers fetch this when opening inventory;
            save merges with built-in defaults so partial edits stay safe.
          </p>
          <textarea
            className="w-full min-h-[240px] rounded-xl border border-border bg-surface-raised px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-muted"
            value={presetsJson}
            onChange={(e) => setPresetsJson(e.target.value)}
            spellCheck={false}
            aria-label="Product attribute presets JSON"
          />
        </SettingsSection>

        <SettingsSection title="Return & cancellation (marketplace-wide)" delay={0.32}>
          <p className="text-xs text-text-muted -mt-2 mb-3">
            Applies to <strong>all products from all sellers</strong>. Sellers cannot override these values. Saving updates every product in the catalog to match.
          </p>
          <div className="space-y-3">
            <FormToggle
              label="Orders can be cancelled before shipping"
              checked={data.returnPolicy?.isCancellable ?? true}
              onChange={(v) =>
                setData((d) =>
                  d
                    ? {
                        ...d,
                        returnPolicy: { ...d.returnPolicy, isCancellable: v },
                      }
                    : null,
                )
              }
            />
            <FormToggle
              label="Returns allowed after delivery"
              checked={data.returnPolicy?.isReturnable ?? true}
              onChange={(v) =>
                setData((d) =>
                  d
                    ? {
                        ...d,
                        returnPolicy: { ...d.returnPolicy, isReturnable: v },
                      }
                    : null,
                )
              }
            />
            <FormToggle
              label="Replacement / exchange allowed"
              checked={data.returnPolicy?.isReplaceable ?? false}
              onChange={(v) =>
                setData((d) =>
                  d
                    ? {
                        ...d,
                        returnPolicy: { ...d.returnPolicy, isReplaceable: v },
                      }
                    : null,
                )
              }
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <FormField label="Return window (days after delivery)">
              <FormInput
                type="number"
                min={0}
                value={data.returnPolicy?.returnWindow ?? 7}
                onChange={(e) =>
                  setData((d) =>
                    d
                      ? {
                          ...d,
                          returnPolicy: {
                            ...d.returnPolicy,
                            returnWindow: +e.target.value,
                          },
                        }
                      : null,
                  )
                }
              />
            </FormField>
            <FormField label="Cancellation window (hours after order)">
              <FormInput
                type="number"
                min={0}
                value={data.returnPolicy?.cancellationWindow ?? 0}
                onChange={(e) =>
                  setData((d) =>
                    d
                      ? {
                          ...d,
                          returnPolicy: {
                            ...d.returnPolicy,
                            cancellationWindow: +e.target.value,
                          },
                        }
                      : null,
                  )
                }
              />
              <p className="text-[10px] text-text-muted mt-1">Use 0 for “cancellable until shipped” (no fixed hour limit).</p>
            </FormField>
          </div>
        </SettingsSection>

        <div className="h-20" />
      </div>

      <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-border bg-surface/90 backdrop-blur-sm px-6 py-3">
        <div className="max-w-4xl flex justify-end">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  );
}

// ───────────────────────── Xelgo provider sub-forms ─────────────────────────

type SetData = React.Dispatch<React.SetStateAction<Settings | null>>;
type ProviderProps = { data: Settings; setData: SetData };

/** Small banner shown above each provider's credential form. */
function ProviderHelp({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-text-muted rounded-lg bg-info-50 border border-info-100 px-3 py-2">
      {children}
    </div>
  );
}

/** Hint line below a secret input (e.g. "Saved password ends with ••92"). */
function SecretHint({ hint }: { hint?: string }) {
  return (
    <p className="text-[11px] text-text-muted mt-1">{hint || 'Status will appear after save/reload.'}</p>
  );
}

function PlatformLogisticsDelhivery({ data, setData }: ProviderProps) {
  const d = data.platformLogistics?.delhivery ?? {};
  const patch = (k: string, v: unknown) =>
    setData((s) =>
      s
        ? {
            ...s,
            platformLogistics: {
              ...s.platformLogistics,
              delhivery: { ...s.platformLogistics?.delhivery, [k]: v },
            },
          }
        : null,
    );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <div className="sm:col-span-2">
        <ProviderHelp>
          From <strong>Delhivery One</strong>: copy your <em>API Token</em> (Settings → API Setup) and
          the exact <em>Warehouse Name</em> (Settings → Warehouses). Server env still works as a
          fallback: <code className="text-[11px] bg-gray-100 px-1 rounded">DELHIVERY_API_TOKEN</code>,{' '}
          <code className="text-[11px] bg-gray-100 px-1 rounded">DELHIVERY_CLIENT_NAME</code>,{' '}
          <code className="text-[11px] bg-gray-100 px-1 rounded">DELHIVERY_WAREHOUSE_NAME</code>.
        </ProviderHelp>
      </div>
      <FormField label="Client name (registered with Delhivery)">
        <FormInput
          value={d.clientName ?? ''}
          onChange={(e) => patch('clientName', e.target.value)}
          placeholder="e.g. XELNOVA PRIVATE LIMITED"
        />
      </FormField>
      <FormField label="Pickup location / warehouse name">
        <FormInput
          value={d.warehouseName ?? ''}
          onChange={(e) => patch('warehouseName', e.target.value)}
          placeholder="Exact name in Delhivery One → Warehouses"
        />
      </FormField>
      <FormField label="API environment">
        <FormSelect
          value={d.environment ?? 'production'}
          onChange={(e) => patch('environment', e.target.value)}
        >
          <option value="production">Production (Live — track.delhivery.com)</option>
          <option value="staging">Staging (sandbox — staging-express.delhivery.com)</option>
        </FormSelect>
      </FormField>
      <FormField label="Default service mode">
        <FormSelect
          value={d.shippingMode ?? 'Surface'}
          onChange={(e) => patch('shippingMode', e.target.value)}
        >
          <option value="Surface">Surface</option>
          <option value="Express">Express</option>
        </FormSelect>
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="Registered GSTIN (optional, for B2B labels)">
          <FormInput
            value={d.sellerGstin ?? ''}
            onChange={(e) => patch('sellerGstin', e.target.value)}
            placeholder="15-character GSTIN if required for your account"
          />
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <FormField label="Live API token (leave blank to keep existing)">
          <FormInput
            type="password"
            autoComplete="off"
            value={d.apiToken ?? ''}
            onChange={(e) => patch('apiToken', e.target.value)}
            placeholder="Paste new token only when rotating"
          />
          <SecretHint hint={d.apiTokenHint} />
        </FormField>
      </div>
    </div>
  );
}

function PlatformLogisticsShipRocket({ data, setData }: ProviderProps) {
  const d = data.platformLogistics?.shiprocket ?? {};
  const patch = (k: string, v: unknown) =>
    setData((s) =>
      s
        ? {
            ...s,
            platformLogistics: {
              ...s.platformLogistics,
              shiprocket: { ...s.platformLogistics?.shiprocket, [k]: v },
            },
          }
        : null,
    );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <div className="sm:col-span-2">
        <ProviderHelp>
          In <strong>ShipRocket → Settings → API</strong>, create a dedicated <em>API User</em> (use a
          fresh email, not your dashboard login). Paste that user&apos;s email and password below. The
          pickup location must already exist under <em>Settings → Pickup Addresses</em>.
        </ProviderHelp>
      </div>
      <FormField label="API User email">
        <FormInput
          value={d.email ?? ''}
          onChange={(e) => patch('email', e.target.value)}
          placeholder="e.g. api@xelnova.in"
        />
      </FormField>
      <FormField label="Pickup location name">
        <FormInput
          value={d.pickupLocation ?? ''}
          onChange={(e) => patch('pickupLocation', e.target.value)}
          placeholder='Defaults to "Primary"'
        />
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="API User password (leave blank to keep existing)">
          <FormInput
            type="password"
            autoComplete="off"
            value={d.password ?? ''}
            onChange={(e) => patch('password', e.target.value)}
            placeholder="Paste only when rotating"
          />
          <SecretHint hint={d.passwordHint} />
        </FormField>
      </div>
    </div>
  );
}

function PlatformLogisticsXpressBees({ data, setData }: ProviderProps) {
  const d = data.platformLogistics?.xpressbees ?? {};
  const patch = (k: string, v: unknown) =>
    setData((s) =>
      s
        ? {
            ...s,
            platformLogistics: {
              ...s.platformLogistics,
              xpressbees: { ...s.platformLogistics?.xpressbees, [k]: v },
            },
          }
        : null,
    );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <div className="sm:col-span-2">
        <ProviderHelp>
          Use the same login you use at <strong>shipment.xpressbees.com</strong>. We exchange it for a
          24-hour Bearer token at booking time — the password is stored encrypted, never in plain text.
          Make sure the warehouse name matches <em>Settings → Warehouse</em> exactly.
        </ProviderHelp>
      </div>
      <FormField label="Login email / Enterprise ID">
        <FormInput
          value={d.email ?? ''}
          onChange={(e) => patch('email', e.target.value)}
          placeholder="Your XpressBees login email"
        />
      </FormField>
      <FormField label="Pickup warehouse name">
        <FormInput
          value={d.warehouseName ?? ''}
          onChange={(e) => patch('warehouseName', e.target.value)}
          placeholder="Exact warehouse name from XpressBees portal"
        />
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="Business name on label (optional)">
          <FormInput
            value={d.businessName ?? ''}
            onChange={(e) => patch('businessName', e.target.value)}
            placeholder="e.g. Xelnova Private Limited"
          />
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <FormField label="Login password (leave blank to keep existing)">
          <FormInput
            type="password"
            autoComplete="off"
            value={d.password ?? ''}
            onChange={(e) => patch('password', e.target.value)}
            placeholder="Paste only when rotating"
          />
          <SecretHint hint={d.passwordHint} />
        </FormField>
      </div>
    </div>
  );
}

function PlatformLogisticsEkart({ data, setData }: ProviderProps) {
  const d = data.platformLogistics?.ekart ?? {};
  const patch = (k: string, v: unknown) =>
    setData((s) =>
      s
        ? {
            ...s,
            platformLogistics: {
              ...s.platformLogistics,
              ekart: { ...s.platformLogistics?.ekart, [k]: v },
            },
          }
        : null,
    );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <div className="sm:col-span-2">
        <ProviderHelp>
          From <strong>Ekart Elite → Settings → API Documentation</strong>, copy the <em>Client ID</em>,
          <em> API Username</em>, and <em>API Password</em>. The pickup alias is the registered
          warehouse code (often shown as <em>Pickup Location</em> on the dashboard).
        </ProviderHelp>
      </div>
      <FormField label="Client ID">
        <FormInput
          value={d.clientId ?? ''}
          onChange={(e) => patch('clientId', e.target.value)}
          placeholder="e.g. EKART_698317571ff77a997480dcce"
        />
      </FormField>
      <FormField label="API username">
        <FormInput
          value={d.username ?? ''}
          onChange={(e) => patch('username', e.target.value)}
          placeholder="API username from Ekart Elite"
        />
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="Pickup location alias (optional)">
          <FormInput
            value={d.pickupAlias ?? ''}
            onChange={(e) => patch('pickupAlias', e.target.value)}
            placeholder="e.g. Delhi-Warehouse"
          />
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <FormField label="API password (leave blank to keep existing)">
          <FormInput
            type="password"
            autoComplete="off"
            value={d.password ?? ''}
            onChange={(e) => patch('password', e.target.value)}
            placeholder="Paste only when rotating"
          />
          <SecretHint hint={d.passwordHint} />
        </FormField>
      </div>
    </div>
  );
}
