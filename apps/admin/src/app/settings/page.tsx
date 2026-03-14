'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  Globe,
  Mail,
  DollarSign,
  Store,
  Bell,
  Smartphone,
  BellRing,
  Settings,
  FileText,
} from 'lucide-react';

interface ToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200"
      style={{ backgroundColor: enabled ? '#D4AF37' : '#d1d5db' }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="inline-block h-5 w-5 rounded-full bg-white shadow-sm"
        style={{ marginLeft: enabled ? '26px' : '2px' }}
      />
    </button>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.08 },
  }),
};

export default function SettingsPage() {
  const [siteName, setSiteName] = useState('XelNova Marketplace');
  const [siteDescription, setSiteDescription] = useState(
    'Premium multi-vendor e-commerce platform'
  );
  const [contactEmail, setContactEmail] = useState('admin@xelnova.com');
  const [currency, setCurrency] = useState('USD');

  const [taxEnabled, setTaxEnabled] = useState(true);
  const [defaultTax, setDefaultTax] = useState('18');
  const [autoApprove, setAutoApprove] = useState(false);

  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-heading">
          Settings
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Configure your marketplace settings and preferences
        </p>
      </div>

      {/* General Settings */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="overflow-hidden rounded-2xl border border-border bg-white shadow-card"
      >
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <Globe size={18} className="text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-heading">
                General Settings
              </h2>
              <p className="text-sm text-muted">
                Basic site information and configuration
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-heading">
                Site Name
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-heading">
                Contact Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="input-field w-full pl-10"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-heading">
              Site Description
            </label>
            <textarea
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              rows={3}
              className="input-field h-auto w-full resize-none px-3.5 py-3"
            />
          </div>
          <div className="max-w-xs">
            <label className="mb-1.5 block text-sm font-medium text-heading">
              Currency
            </label>
            <div className="relative">
              <DollarSign
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-field w-full cursor-pointer pl-10"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (&euro;)</option>
                <option value="GBP">GBP (&pound;)</option>
                <option value="INR">INR (&rupee;)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button className="btn-primary">
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>

      {/* Store Settings */}
      <motion.div
        custom={1}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="overflow-hidden rounded-2xl border border-border bg-white shadow-card"
      >
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-50">
              <Store size={18} className="text-info-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-heading">
                Store Settings
              </h2>
              <p className="text-sm text-muted">
                Tax, product, and checkout settings
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-6 py-6">
          <div className="flex items-center justify-between rounded-xl border border-border bg-gray-50/50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-50">
                <FileText size={15} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-heading">Tax Enabled</p>
                <p className="text-xs text-muted">Apply tax to all orders</p>
              </div>
            </div>
            <Toggle enabled={taxEnabled} onChange={setTaxEnabled} />
          </div>

          {taxEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-xs pl-1"
            >
              <label className="mb-1.5 block text-sm font-medium text-heading">
                Default Tax Rate (%)
              </label>
              <input
                type="number"
                value={defaultTax}
                onChange={(e) => setDefaultTax(e.target.value)}
                className="input-field w-full"
              />
            </motion.div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-border bg-gray-50/50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-50">
                <Settings size={15} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-heading">
                  Auto-approve Products
                </p>
                <p className="text-xs text-muted">
                  Automatically approve new product listings
                </p>
              </div>
            </div>
            <Toggle enabled={autoApprove} onChange={setAutoApprove} />
          </div>

          <div className="flex justify-end pt-2">
            <button className="btn-primary">
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        custom={2}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="overflow-hidden rounded-2xl border border-border bg-white shadow-card"
      >
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-50">
              <Bell size={18} className="text-warning-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-heading">
                Notification Settings
              </h2>
              <p className="text-sm text-muted">
                Choose how you want to receive alerts
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 px-6 py-6">
          <div className="flex items-center justify-between rounded-xl border border-border bg-gray-50/50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-50">
                <Mail size={15} className="text-info-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-heading">
                  Email Notifications
                </p>
                <p className="text-xs text-muted">
                  Receive order and activity alerts via email
                </p>
              </div>
            </div>
            <Toggle enabled={emailNotif} onChange={setEmailNotif} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-gray-50/50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-50">
                <Smartphone size={15} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-heading">
                  SMS Notifications
                </p>
                <p className="text-xs text-muted">
                  Get critical alerts via text message
                </p>
              </div>
            </div>
            <Toggle enabled={smsNotif} onChange={setSmsNotif} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-gray-50/50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                <BellRing size={15} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-heading">
                  Push Notifications
                </p>
                <p className="text-xs text-muted">
                  Browser push notifications for real-time updates
                </p>
              </div>
            </div>
            <Toggle enabled={pushNotif} onChange={setPushNotif} />
          </div>

          <div className="flex justify-end pt-3">
            <button className="btn-primary">
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
