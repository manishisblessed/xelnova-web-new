'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { FormField, FormInput, FormSelect, FormToggle } from '@/components/dashboard/form-field';
import { Button } from '@xelnova/ui';
import { Save } from 'lucide-react';
import { apiGet, apiPatchSiteSettings } from '@/lib/api';
import { toast } from 'sonner';

interface Settings {
  general: { siteName: string; tagline: string; currency: string; timezone: string; language: string };
  tax: { gstEnabled: boolean; gstRate: number; hsnDefault: string };
  shipping: { freeShippingMin: number; defaultRate: number; expressRate: number; codEnabled: boolean; codFee: number };
  payment: { razorpayEnabled: boolean; codEnabled: boolean; upiEnabled: boolean; cardEnabled: boolean; netBankingEnabled: boolean };
  notifications: { orderConfirmation: boolean; shipmentUpdate: boolean; promotionalEmails: boolean; smsAlerts: boolean; adminNewOrder: boolean };
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

        <div className="flex justify-end pt-2 pb-8">
          <Button variant="primary" onClick={() => void save()} size="md" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </>
  );
}
