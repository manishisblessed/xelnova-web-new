'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { apiGet, apiCreate, apiUpdate, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  percentage: number;
  createdAt: string;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ key: '', name: '', description: '', percentage: 100 });
  const [creating, setCreating] = useState(false);

  const loadFlags = useCallback(async () => {
    try {
      const data = await apiGet<FeatureFlag[]>('feature-flags');
      setFlags(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFlags(); }, [loadFlags]);

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      await apiUpdate('feature-flags', flag.id, { enabled: !flag.enabled });
      setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, enabled: !f.enabled } : f));
      toast.success(`${flag.name} ${!flag.enabled ? 'enabled' : 'disabled'}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update flag');
    }
  };

  const handlePercentage = async (flag: FeatureFlag, percentage: number) => {
    try {
      await apiUpdate('feature-flags', flag.id, { percentage });
      setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, percentage } : f));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update rollout');
    }
  };

  const handleDelete = async (flag: FeatureFlag) => {
    if (!confirm(`Delete flag "${flag.name}"?`)) return;
    try {
      await apiDelete('feature-flags', flag.id);
      setFlags((prev) => prev.filter((f) => f.id !== flag.id));
      toast.success('Flag deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete flag');
    }
  };

  const handleCreate = async () => {
    if (!form.key.trim() || !form.name.trim()) return;
    setCreating(true);
    try {
      await apiCreate('feature-flags', { ...form, enabled: false });
      setShowCreate(false);
      setForm({ key: '', name: '', description: '', percentage: 100 });
      setLoading(true);
      loadFlags();
      toast.success('Feature flag created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create flag');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Feature Flags" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} /> New Flag
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : flags.length === 0 ? (
          <div className="text-center py-20 text-text-muted text-sm">
            No feature flags yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map((flag, i) => (
              <motion.div
                key={flag.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card"
              >
                <button onClick={() => handleToggle(flag)} className="shrink-0">
                  {flag.enabled ? (
                    <ToggleRight size={28} className="text-success-600" />
                  ) : (
                    <ToggleLeft size={28} className="text-text-muted" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary">{flag.name}</p>
                    <code className="text-xs bg-surface-muted text-text-secondary px-1.5 py-0.5 rounded">{flag.key}</code>
                  </div>
                  {flag.description && (
                    <p className="text-xs text-text-secondary mt-0.5">{flag.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Rollout</p>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={flag.percentage}
                      onChange={(e) => handlePercentage(flag, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-16 text-right rounded-lg border border-border px-2 py-1 text-sm text-text-primary"
                    />
                    <span className="text-xs text-text-muted">%</span>
                  </div>
                  <button onClick={() => handleDelete(flag)} className="text-text-muted hover:text-danger-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-text-primary">Create Feature Flag</h3>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Key *</label>
                <input
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_') })}
                  placeholder="e.g. new_checkout_flow"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="New Checkout Flow"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What this flag controls..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Rollout %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.percentage}
                  onChange={(e) => setForm({ ...form, percentage: parseInt(e.target.value) || 100 })}
                  className="w-24 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleCreate()}
                  disabled={creating || !form.key.trim() || !form.name.trim()}
                  className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />} Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}
