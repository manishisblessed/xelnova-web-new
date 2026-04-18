'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Plus, CheckCircle, Clock, XCircle } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { apiGetSellerBrands, apiProposeBrand } from '@/lib/api';
import Image from 'next/image';

type Brand = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  approved: boolean;
  isActive: boolean;
  createdAt: string;
  authorizationCertificate?: string | null;
  rejectionReason?: string | null;
};

const statusConfig = {
  approved: { label: 'Approved', color: 'bg-green-50 text-green-700', icon: CheckCircle },
  pending: { label: 'Pending Approval', color: 'bg-amber-50 text-amber-700', icon: Clock },
  rejected: { label: 'Inactive', color: 'bg-red-50 text-red-700', icon: XCircle },
};

function getBrandStatus(b: Brand) {
  if (b.approved && b.isActive) return statusConfig.approved;
  if (!b.approved) return statusConfig.pending;
  return statusConfig.rejected;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [authorizationCertificate, setAuthorizationCertificate] = useState('');
  const [creating, setCreating] = useState(false);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const data = await apiGetSellerBrands() as Brand[];
      setBrands(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBrands(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await apiProposeBrand(
        name.trim(),
        logo.trim() || undefined,
        authorizationCertificate.trim() || undefined,
      );
      setShowCreate(false);
      setName('');
      setLogo('');
      setAuthorizationCertificate('');
      loadBrands();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Brands" subtitle="Manage the brands you sell on Xelnova" />
      <div className="p-6 max-w-4xl">
        {/*
          Per testing observation #25 — sellers were unsure what the
          "Brands" section was for. The short answer: every product you list
          must be tagged with a brand so customers can filter by brand and
          our search ranks branded results higher. If your brand isn't
          listed yet, propose it here and our catalogue team approves it
          (usually within a business day). Approved brands then appear in
          the "Brand" picker on the Add / Edit Product screen and on the
          public product listing as a small badge next to each item.
        */}
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 mb-6">
          <h3 className="text-sm font-semibold text-violet-800">Why does this section exist?</h3>
          <ul className="mt-2 space-y-1 text-xs text-violet-900/80 list-disc list-inside">
            <li>Every product you upload must be tagged with a brand — buyers filter, sort and search by brand.</li>
            <li>If your brand isn&apos;t in our master list yet, propose it from this page and our catalogue team approves it (usually within 1 business day).</li>
            <li>Once approved, the brand appears in the &ldquo;Brand&rdquo; picker on Add / Edit Product, and as a badge on the product listing.</li>
          </ul>
        </div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{brands.length} brand(s)</p>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
            <Plus size={16} />
            Propose Brand
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">{error}</div>
        )}

        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 className="text-base font-semibold mb-4">Propose a New Brand</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g. Nike" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (optional)</label>
                <input value={logo} onChange={(e) => setLogo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Authorisation Certificate URL
                  {brands.length > 0 && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  value={authorizationCertificate}
                  onChange={(e) => setAuthorizationCertificate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="https://drive.google.com/... or any uploaded PDF/image link"
                  required={brands.length > 0}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {brands.length === 0
                    ? 'Optional for your first brand. Required from your second brand onwards so admins can verify you are authorised to sell under that brand.'
                    : 'Required: upload a PDF/image link of the brand authorisation/distributor certificate. Without it your brand cap stays at 1.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {creating ? 'Submitting...' : 'Submit for Approval'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-400 mt-3">Your brand will be reviewed by the admin team before it becomes available.</p>
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading brands...</div>
        ) : brands.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <Tag size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 font-medium">No brands proposed yet</p>
            <p className="text-gray-400 text-sm mt-1">{'Click "Propose Brand" to suggest a new brand.'}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {brands.map((b, i) => {
              const st = getBrandStatus(b);
              const Icon = st.icon;
              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  {b.logo ? (
                    <Image src={b.logo} alt={b.name} width={48} height={48} className="w-12 h-12 rounded-lg object-contain bg-gray-50 p-1" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-violet-50 flex items-center justify-center">
                      <Tag size={20} className="text-violet-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{b.name}</h4>
                    <p className="text-xs text-gray-400">Slug: {b.slug}</p>
                    {b.rejectionReason && (
                      <p className="text-xs text-red-600 mt-1">
                        Admin note: {b.rejectionReason}
                      </p>
                    )}
                    {b.authorizationCertificate && (
                      <a
                        href={b.authorizationCertificate}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-violet-600 hover:underline mt-1 inline-block"
                      >
                        View uploaded certificate
                      </a>
                    )}
                  </div>
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${st.color}`}>
                    <Icon size={14} />
                    {st.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
