'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Ticket, Pencil, Trash2, X, Copy, Check, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import {
  apiGetSellerCoupons,
  apiCreateSellerCoupon,
  apiUpdateSellerCoupon,
  apiDeleteSellerCoupon,
} from '@/lib/api';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  validUntil: string | null;
  isActive: boolean;
  usageLimit: number | null;
  usedCount: number;
  scope: string;
  createdAt: string;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
}

const empty = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE' as string,
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscount: undefined as number | undefined,
  validUntil: '',
  usageLimit: undefined as number | undefined,
  scope: 'seller',
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGetSellerCoupons() as Coupon[];
      setCoupons(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setError('');
    setShowModal(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || '',
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount,
      maxDiscount: c.maxDiscount ?? undefined,
      validUntil: c.validUntil ? c.validUntil.split('T')[0] : '',
      usageLimit: c.usageLimit ?? undefined,
      scope: c.scope === 'global' ? 'cart' : 'seller',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { setError('Coupon code is required'); return; }
    if (form.discountValue <= 0) { setError('Discount value must be > 0'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        code: form.code,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: form.discountValue,
        minOrderAmount: form.minOrderAmount || 0,
        maxDiscount: form.maxDiscount || undefined,
        validUntil: form.validUntil || undefined,
        usageLimit: form.usageLimit || undefined,
        scope: form.scope,
      };
      if (editing) {
        await apiUpdateSellerCoupon(editing.id, payload);
      } else {
        await apiCreateSellerCoupon(payload);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to save coupon');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await apiDeleteSellerCoupon(id);
      load();
    } catch {}
  };

  const handleToggle = async (c: Coupon) => {
    try {
      await apiUpdateSellerCoupon(c.id, { isActive: !c.isActive });
      load();
    } catch {}
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <DashboardHeader
        title="Coupons & Discounts"
        subtitle="Create coupons for your products or cart-level discounts"
      />
      <div className="p-6 max-w-5xl">
        {/* Approval info banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Coupon Approval Process</p>
            <p className="text-blue-700">All new coupons require admin approval before customers can use them. If you edit an approved coupon, it will be sent for re-approval. You&apos;ll be notified once your coupon is approved or if any changes are needed.</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{coupons.length} coupon(s)</p>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
            <Plus size={16} />Create Coupon
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16">
            <Ticket size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No coupons yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first coupon to attract customers</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {coupons.map((c) => {
              const isPending = c.moderationStatus === 'PENDING';
              const isRejected = c.moderationStatus === 'REJECTED';
              const isApproved = c.moderationStatus === 'APPROVED';
              const canToggle = isApproved;

              return (
                <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`bg-white rounded-2xl border p-5 ${isRejected ? 'border-red-200 bg-red-50/30' : isPending ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <button onClick={() => copyCode(c.code)} className="font-mono text-lg font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-lg hover:bg-violet-100 transition-colors flex items-center gap-2">
                          {c.code}
                          {copied === c.code ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-violet-400" />}
                        </button>
                        {/* Moderation Status Badge */}
                        {isPending && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                            <Clock size={12} />
                            Pending Approval
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Rejected
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle size={12} />
                            Approved
                          </span>
                        )}
                        {/* Active/Inactive badge - only show for approved coupons */}
                        {isApproved && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.scope === 'global' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {c.scope === 'global' ? 'Cart-level' : 'Product-level'}
                        </span>
                      </div>
                      {c.description && <p className="text-sm text-gray-600 mb-2">{c.description}</p>}
                      {/* Show rejection reason if rejected */}
                      {isRejected && c.rejectionReason && (
                        <div className="flex items-start gap-2 mb-2 p-2 bg-red-100 rounded-lg">
                          <AlertTriangle size={14} className="text-red-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-red-700"><strong>Rejection reason:</strong> {c.rejectionReason}</p>
                        </div>
                      )}
                      {/* Show pending message */}
                      {isPending && (
                        <div className="flex items-start gap-2 mb-2 p-2 bg-amber-100 rounded-lg">
                          <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-700">This coupon is awaiting admin approval. Once approved, customers will be able to use it.</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                        <span>{c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : `₹${c.discountValue} flat`}</span>
                        {c.minOrderAmount > 0 && <span>Min order: ₹{c.minOrderAmount}</span>}
                        {c.maxDiscount && <span>Max: ₹{c.maxDiscount}</span>}
                        {c.usageLimit && <span>Uses: {c.usedCount}/{c.usageLimit}</span>}
                        {c.validUntil && <span>Expires: {new Date(c.validUntil).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Only allow toggle for approved coupons */}
                      {canToggle ? (
                        <button onClick={() => handleToggle(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${c.isActive ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-green-50 hover:bg-green-100 text-green-700'}`}>
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-400 cursor-not-allowed" title={isPending ? 'Awaiting approval' : 'Coupon was rejected'}>
                          {isPending ? 'Awaiting Approval' : 'Rejected'}
                        </span>
                      )}
                      <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Edit coupon">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete coupon">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-lg font-semibold">{editing ? 'Edit Coupon' : 'Create Coupon'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE20" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Get 20% off on all products" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                  <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="seller">Product-level (your products only)</option>
                    <option value="cart">Cart-level (entire cart discount)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                    <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FLAT">Flat (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value *</label>
                    <input type="number" min={0} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₹)</label>
                    <input type="number" min={0} value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
                    <input type="number" min={0} value={form.maxDiscount || ''} onChange={(e) => setForm({ ...form, maxDiscount: parseFloat(e.target.value) || undefined })} placeholder="No limit" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                    <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                    <input type="number" min={1} value={form.usageLimit || ''} onChange={(e) => setForm({ ...form, usageLimit: parseInt(e.target.value) || undefined })} placeholder="Unlimited" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 p-5 border-t">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
