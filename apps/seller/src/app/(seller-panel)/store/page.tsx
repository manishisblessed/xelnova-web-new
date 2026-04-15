'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Store,
  Image as ImageIcon,
  FileText,
  Star,
  Upload,
  Trash2,
  GripVertical,
  Plus,
  ExternalLink,
  Loader2,
  Eye,
  Palette,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button, Input, Modal } from '@xelnova/ui';
import {
  apiGetStoreSettings,
  apiUpdateStoreSettings,
  apiUpdateFeaturedProducts,
  apiCreateStoreBanner,
  apiUpdateStoreBanner,
  apiDeleteStoreBanner,
  apiUploadImage,
  type StoreSettings,
  type SellerStoreBanner,
} from '@/lib/api';
import { formatCurrency } from '@xelnova/utils';

export default function StoreSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Form state
  const [heroBannerUrl, setHeroBannerUrl] = useState('');
  const [heroBannerMobile, setHeroBannerMobile] = useState('');
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutDescription, setAboutDescription] = useState('');
  const [storeThemeColor, setStoreThemeColor] = useState('#7c3aed');
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);

  // Banner modal
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<SellerStoreBanner | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    imageUrl: '',
    mobileUrl: '',
    link: '',
  });
  const [bannerUploading, setBannerUploading] = useState(false);

  // Featured products modal
  const [featuredModalOpen, setFeaturedModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGetStoreSettings();
      setSettings(data);
      setHeroBannerUrl(data.heroBannerUrl || '');
      setHeroBannerMobile(data.heroBannerMobile || '');
      setAboutTitle(data.aboutTitle || '');
      setAboutDescription(data.aboutDescription || '');
      setStoreThemeColor(data.storeThemeColor || '#7c3aed');
      setFeaturedProductIds(data.featuredProductIds || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load store settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await apiUpdateStoreSettings({
        heroBannerUrl: heroBannerUrl || undefined,
        heroBannerMobile: heroBannerMobile || undefined,
        aboutTitle: aboutTitle || undefined,
        aboutDescription: aboutDescription || undefined,
        storeThemeColor: storeThemeColor || undefined,
      });
      toast.success('Store settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadHeroBanner = async (e: React.ChangeEvent<HTMLInputElement>, mobile = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await apiUploadImage(file);
      if (mobile) {
        setHeroBannerMobile(result.url);
      } else {
        setHeroBannerUrl(result.url);
      }
      toast.success('Banner uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload banner');
    }
  };

  // Banner CRUD
  const handleAddBanner = () => {
    setEditingBanner(null);
    setBannerForm({ title: '', imageUrl: '', mobileUrl: '', link: '' });
    setBannerModalOpen(true);
  };

  const handleEditBanner = (banner: SellerStoreBanner) => {
    setEditingBanner(banner);
    setBannerForm({
      title: banner.title || '',
      imageUrl: banner.imageUrl,
      mobileUrl: banner.mobileUrl || '',
      link: banner.link || '',
    });
    setBannerModalOpen(true);
  };

  const handleSaveBanner = async () => {
    if (!bannerForm.imageUrl) {
      toast.error('Please upload a banner image');
      return;
    }

    try {
      setBannerUploading(true);
      if (editingBanner) {
        await apiUpdateStoreBanner(editingBanner.id, bannerForm);
        toast.success('Banner updated');
      } else {
        await apiCreateStoreBanner(bannerForm);
        toast.success('Banner added');
      }
      setBannerModalOpen(false);
      loadSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save banner');
    } finally {
      setBannerUploading(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await apiDeleteStoreBanner(id);
      toast.success('Banner deleted');
      loadSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete banner');
    }
  };

  const handleUploadBannerImage = async (e: React.ChangeEvent<HTMLInputElement>, mobile = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBannerUploading(true);
      const result = await apiUploadImage(file);
      setBannerForm((prev) => ({
        ...prev,
        [mobile ? 'mobileUrl' : 'imageUrl']: result.url,
      }));
      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setBannerUploading(false);
    }
  };

  // Featured products
  const handleSaveFeaturedProducts = async () => {
    try {
      setSaving(true);
      await apiUpdateFeaturedProducts(featuredProductIds);
      toast.success('Featured products updated');
      setFeaturedModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update featured products');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeaturedProduct = (productId: string) => {
    setFeaturedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : prev.length < 20
        ? [...prev, productId]
        : prev
    );
  };

  const filteredProducts = settings?.availableProducts.filter(
    (p) =>
      !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Store Settings"
        subtitle="Customize your brand store appearance"
      />

      <div className="flex items-center justify-end gap-3 -mt-4 mb-6">
        {settings?.storeUrl && (
          <a
            href={settings.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-primary-600 border border-border rounded-lg hover:border-primary-300 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview Store
          </a>
        )}
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hero Banner Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary-100">
              <ImageIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Hero Banner</h3>
              <p className="text-sm text-text-secondary">
                Main banner displayed at the top of your store
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Desktop Banner */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Desktop Banner (3000 x 600px recommended)
              </label>
              {heroBannerUrl ? (
                <div className="relative aspect-[5/1] rounded-lg overflow-hidden border border-border">
                  <img
                    src={heroBannerUrl}
                    alt="Hero banner"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setHeroBannerUrl('')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-[5/1] rounded-lg border-2 border-dashed border-border hover:border-primary-400 cursor-pointer transition-colors bg-surface-muted">
                  <Upload className="w-8 h-8 text-text-muted mb-2" />
                  <span className="text-sm text-text-secondary">
                    Click to upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadHeroBanner(e, false)}
                  />
                </label>
              )}
            </div>

            {/* Mobile Banner */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Mobile Banner (Optional - 1200 x 600px recommended)
              </label>
              {heroBannerMobile ? (
                <div className="relative aspect-[2/1] max-w-xs rounded-lg overflow-hidden border border-border">
                  <img
                    src={heroBannerMobile}
                    alt="Mobile banner"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setHeroBannerMobile('')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-[2/1] max-w-xs rounded-lg border-2 border-dashed border-border hover:border-primary-400 cursor-pointer transition-colors bg-surface-muted">
                  <Upload className="w-6 h-6 text-text-muted mb-1" />
                  <span className="text-xs text-text-secondary">
                    Upload mobile version
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadHeroBanner(e, true)}
                  />
                </label>
              )}
            </div>
          </div>
        </motion.div>

        {/* Theme Color */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100">
              <Palette className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Store Theme</h3>
              <p className="text-sm text-text-secondary">
                Customize your store&apos;s primary color
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="color"
              value={storeThemeColor}
              onChange={(e) => setStoreThemeColor(e.target.value)}
              className="w-16 h-16 rounded-lg border border-border cursor-pointer"
            />
            <div>
              <div className="text-sm font-medium text-text-primary">
                Primary Color
              </div>
              <div className="text-sm text-text-secondary font-mono">
                {storeThemeColor}
              </div>
            </div>
          </div>
        </motion.div>

        {/* About Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">About Section</h3>
              <p className="text-sm text-text-secondary">
                Tell customers about your brand
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Title"
              placeholder="Our Story"
              value={aboutTitle}
              onChange={(e) => setAboutTitle(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Description
              </label>
              <textarea
                placeholder="Tell your brand story..."
                value={aboutDescription}
                onChange={(e) => setAboutDescription(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-lg border border-border bg-surface focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </motion.div>

        {/* Carousel Banners */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <ImageIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">
                  Banner Carousel
                </h3>
                <p className="text-sm text-text-secondary">
                  Add multiple banners that rotate automatically
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleAddBanner}>
              <Plus className="w-4 h-4 mr-2" />
              Add Banner
            </Button>
          </div>

          {settings?.storeBanners && settings.storeBanners.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {settings.storeBanners.map((banner, index) => (
                <div
                  key={banner.id}
                  className="relative rounded-lg overflow-hidden border border-border group"
                >
                  <img
                    src={banner.imageUrl}
                    alt={banner.title || `Banner ${index + 1}`}
                    className="w-full aspect-[2/1] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEditBanner(banner)}
                      className="p-2 rounded-full bg-white text-gray-900 hover:bg-gray-100"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {banner.title && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white text-sm font-medium truncate">
                        {banner.title}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              No carousel banners yet. Add your first banner to showcase
              promotions.
            </div>
          )}
        </motion.div>

        {/* Featured Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Star className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">
                  Featured Products
                </h3>
                <p className="text-sm text-text-secondary">
                  Highlight up to 20 products on your store
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setFeaturedModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Manage Products
            </Button>
          </div>

          {featuredProductIds.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {featuredProductIds.map((id) => {
                const product = settings?.availableProducts.find((p) => p.id === id);
                if (!product) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-muted border border-border"
                  >
                    {product.images[0] && (
                      <img
                        src={product.images[0]}
                        alt=""
                        className="w-6 h-6 rounded object-cover"
                      />
                    )}
                    <span className="text-sm text-text-primary truncate max-w-32">
                      {product.name}
                    </span>
                    <button
                      onClick={() => toggleFeaturedProduct(id)}
                      className="text-text-muted hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              No featured products selected. Choose products to highlight on your store.
            </div>
          )}
        </motion.div>
      </div>

      {/* Banner Modal */}
      <Modal
        open={bannerModalOpen}
        onClose={() => setBannerModalOpen(false)}
        title={editingBanner ? 'Edit Banner' : 'Add Banner'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title (Optional)"
            placeholder="Summer Sale"
            value={bannerForm.title}
            onChange={(e) =>
              setBannerForm((prev) => ({ ...prev, title: e.target.value }))
            }
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Banner Image
            </label>
            {bannerForm.imageUrl ? (
              <div className="relative aspect-[2/1] rounded-lg overflow-hidden border border-border">
                <img
                  src={bannerForm.imageUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() =>
                    setBannerForm((prev) => ({ ...prev, imageUrl: '' }))
                  }
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-[2/1] rounded-lg border-2 border-dashed border-border hover:border-primary-400 cursor-pointer transition-colors bg-surface-muted">
                {bannerUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-text-muted mb-2" />
                    <span className="text-sm text-text-secondary">
                      Click to upload
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadBannerImage(e, false)}
                  disabled={bannerUploading}
                />
              </label>
            )}
          </div>

          <Input
            label="Link (Optional)"
            placeholder="https://xelnova.in/products/..."
            value={bannerForm.link}
            onChange={(e) =>
              setBannerForm((prev) => ({ ...prev, link: e.target.value }))
            }
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setBannerModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBanner} disabled={bannerUploading}>
              {bannerUploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingBanner ? 'Update' : 'Add'} Banner
            </Button>
          </div>
        </div>
      </Modal>

      {/* Featured Products Modal */}
      <Modal
        open={featuredModalOpen}
        onClose={() => setFeaturedModalOpen(false)}
        title="Select Featured Products"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="text-sm text-text-secondary">
            {featuredProductIds.length}/20 products selected
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredProducts?.map((product) => (
              <label
                key={product.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  featuredProductIds.includes(product.id)
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-border hover:border-primary-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={featuredProductIds.includes(product.id)}
                  onChange={() => toggleFeaturedProduct(product.id)}
                  className="sr-only"
                />
                {product.images[0] && (
                  <img
                    src={product.images[0]}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {product.name}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    featuredProductIds.includes(product.id)
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-border'
                  }`}
                >
                  {featuredProductIds.includes(product.id) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setFeaturedModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveFeaturedProducts} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save Selection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
