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
}

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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try { setData(await apiGet<Settings>('settings')); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!data) return;
    try {
      setSaving(true);
      await apiPatchSiteSettings(data as unknown as Record<string, unknown>);
      toast.success('Settings saved');
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
