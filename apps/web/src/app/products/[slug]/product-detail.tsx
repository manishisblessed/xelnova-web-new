"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Heart, Share2, ShieldCheck, Truck, RotateCcw, ChevronRight,
  Minus, Plus, ThumbsUp, Check, ShoppingCart, Package, Loader2, Ruler, X,
  RefreshCw, Lock, ChevronDown, ChevronUp, AlertTriangle, FileText, Store,
  Play,
} from "lucide-react";
import { cn } from "@xelnova/utils";
import { formatCurrency, formatDate, priceInclusiveOfGst } from "@xelnova/utils";
import { useProductBySlug, useMarketplacePolicy } from "@/lib/api";
import { reviewsApi, setAccessToken } from "@xelnova/api";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { ProductCard } from "@/components/marketplace/product-card";
import type { SizeChartRow } from "@/lib/data/products";

type TabId = "description" | "specifications" | "reviews" | "product-info";

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data, loading } = useProductBySlug(slug);
  const product = data?.product ?? null;
  const { data: marketplacePolicy } = useMarketplacePolicy();

  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("description");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [sizeChartModal, setSizeChartModal] = useState<{ label: string; rows: SizeChartRow[] } | null>(null);
  const [variantGallery, setVariantGallery] = useState<string[] | null>(null);
  const [variantVideo, setVariantVideo] = useState<string | null>(null);
  const [hoverPreviewImage, setHoverPreviewImage] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [pendingQty, setPendingQty] = useState(1);

  /** Pre-select the first SKU per group so PDP/cart use per-option prices instead of only the base price. */
  useEffect(() => {
    if (!product?.variants?.length) {
      setSelectedVariants({});
      return;
    }
    const next: Record<string, string> = {};
    let firstImages: string[] | null = null;
    let firstVideo: string | null = null;
    for (const v of product.variants) {
      const first = v.options?.[0];
      if (first) {
        next[v.type] = first.value;
      }
      // Search all options for images/video (first option may not have them)
      if (!firstImages || !firstVideo) {
        for (const opt of v.options ?? []) {
          if (!firstImages && opt.images && opt.images.length > 0) {
            firstImages = opt.images;
          }
          if (!firstVideo && (opt as any).video) {
            firstVideo = (opt as any).video;
          }
          if (firstImages && firstVideo) break;
        }
      }
    }
    setSelectedVariants(next);
    if (firstImages && (!product.images || product.images.length === 0)) {
      setVariantGallery(firstImages);
      setSelectedImage(0);
    }
    if (firstVideo) setVariantVideo(firstVideo);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the product itself changes, not on every variant reference shift
  }, [product?.id]);

  const setItemQuantity = useCartStore((s) => s.setItemQuantity);
  const getItemQuantity = useCartStore((s) => s.getItemQuantity);
  const toggle = useWishlistStore((s) => s.toggle);
  const productId = product?.id;
  const isInWishlist = useWishlistStore((s) => productId ? s.isInWishlist(productId) : false);

  const similarProducts = data?.relatedProducts || [];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <ShoppingCart size={32} className="text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Product Not Found</h1>
        <p className="mt-2 text-text-secondary">The product you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/products" className="mt-6 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
          Browse Products
        </Link>
      </div>
    );
  }

  // Augment variants with a synthetic "default" option from the main product
  // images so the base product is selectable alongside variant swatches.
  const augmentedVariants = (() => {
    if (!product || product.images.length === 0) return product?.variants ?? [];
    return product.variants.map((variant) => {
      const hasDefault = variant.options.some((o) => o.value === "__default__");
      if (hasDefault) return variant;
      const defaultLabel = variant.defaultLabel || product.name.split("|")[0].trim().slice(0, 30);
      const defaultOption: (typeof variant.options)[number] = {
        value: "__default__",
        label: defaultLabel,
        available: true,
        images: product.images,
        price: product.price,
        compareAtPrice: product.comparePrice > product.price ? product.comparePrice : undefined,
        stock: product.stockCount,
      };
      return { ...variant, options: [defaultOption, ...variant.options] };
    });
  })();

  const variantString = Object.entries(selectedVariants).map(([, v]) => v).join("-");

  const effectivePrice = (() => {
    if (!product) return 0;
    for (const variant of augmentedVariants) {
      const sel = selectedVariants[variant.type];
      if (!sel) continue;
      const opt = variant.options.find((o) => o.value === sel);
      if (opt?.price != null) return opt.price;
    }
    return product.price;
  })();

  const effectiveComparePrice = (() => {
    if (!product) return 0;
    for (const variant of augmentedVariants) {
      const sel = selectedVariants[variant.type];
      if (!sel) continue;
      const opt = variant.options.find((o) => o.value === sel);
      if (opt?.compareAtPrice != null) return opt.compareAtPrice;
    }
    return product.comparePrice;
  })();

  const effectiveStock = (() => {
    if (!product) return 0;
    let found = false;
    let min = Infinity;
    for (const variant of augmentedVariants) {
      const sel = selectedVariants[variant.type];
      if (!sel) continue;
      const opt = variant.options.find((o) => o.value === sel);
      if (opt?.stock != null) {
        found = true;
        min = Math.min(min, opt.stock);
      }
    }
    return found ? min : product.stockCount;
  })();

  const gstRate = product.gstRate ?? null;
  const displayPriceIncl = (exclusive: number) => priceInclusiveOfGst(exclusive, gstRate);
  const salePriceIncl = displayPriceIncl(effectivePrice);
  const mrpIncl = displayPriceIncl(effectiveComparePrice);
  const effectiveDiscount =
    mrpIncl > salePriceIncl && mrpIncl > 0
      ? Math.round(((mrpIncl - salePriceIncl) / mrpIncl) * 100)
      : 0;
  const effectiveInStock = effectiveStock > 0;

  const handleVariantSelect = (type: string, value: string, opt?: { images?: string[]; video?: string }) => {
    setSelectedVariants((prev) => ({ ...prev, [type]: value }));
    setHoverPreviewImage(null);
    if (opt?.images && opt.images.length > 0) {
      setVariantGallery(opt.images);
      setSelectedImage(0);
    }
    // Track variant video
    setVariantVideo(opt?.video || null);
  };

  const handleVariantHover = (opt: { images?: string[] }) => {
    const preview = opt.images?.[0];
    if (preview) setHoverPreviewImage(preview);
  };

  const handleVariantHoverEnd = () => {
    setHoverPreviewImage(null);
  };

  const cartQty = product ? getItemQuantity(product.id, variantString || undefined) : 0;
  const isInCart = cartQty > 0;
  // Allow up to actual available stock (cap at 50 for sanity); fall back to 50 when stock is unknown
  const maxQty = product ? Math.max(1, Math.min(effectiveStock || 50, 50)) : 50;
  const displayQty = isInCart ? cartQty : pendingQty;

  const selectedVariantImage = (() => {
    if (!product) return "";
    for (const variant of augmentedVariants) {
      const sel = selectedVariants[variant.type];
      if (!sel) continue;
      const opt = variant.options.find((o) => o.value === sel);
      if (opt?.images?.[0]) return opt.images[0];
    }
    return "";
  })();

  const cartItemPayload = product ? {
    id: `${product.id}-${variantString || "default"}`,
    productId: product.id,
    name: product.name,
    slug: product.slug,
    price: effectivePrice,
    comparePrice: effectiveComparePrice,
    image: selectedVariantImage || product.images[0] || "",
    variant: variantString || undefined,
    seller: product.seller.name,
    gstRate: product.gstRate ?? null,
  } : null;

  const handleAddToCart = () => {
    if (!cartItemPayload) return;
    if (isInCart) {
      router.push("/cart");
      return;
    }
    const qty = Math.max(1, Math.min(pendingQty, maxQty));
    setItemQuantity(cartItemPayload, qty);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleIncrement = () => {
    if (!cartItemPayload) return;
    if (isInCart) {
      if (cartQty >= maxQty) return;
      setItemQuantity(cartItemPayload, cartQty + 1);
    } else {
      setPendingQty((q) => Math.min(q + 1, maxQty));
    }
  };

  const handleDecrement = () => {
    if (!cartItemPayload) return;
    if (isInCart) {
      if (cartQty <= 0) return;
      setItemQuantity(cartItemPayload, cartQty - 1);
    } else {
      setPendingQty((q) => Math.max(1, q - 1));
    }
  };

  const handleBuyNow = () => {
    if (!cartItemPayload) return;
    const qty = isInCart ? cartQty : Math.max(1, Math.min(pendingQty, maxQty));
    setItemQuantity(cartItemPayload, qty);
    router.push("/cart");
  };

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} on Xelnova`,
      url: shareUrl,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // no-op
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const hasProductInfo = product.featuresAndSpecs || product.materialsAndCare || 
    product.itemDetails || product.additionalDetails || product.productDescription || 
    product.safetyInfo || product.regulatoryInfo;

  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Description" },
    ...(hasProductInfo ? [{ id: "product-info" as TabId, label: "Product Information" }] : []),
    { id: "specifications", label: "Specifications" },
    { id: "reviews", label: `Reviews (${product.reviewCount.toLocaleString("en-IN")})` },
  ];

  const allVariantImages = (() => {
    if (!product?.variants?.length) return [];
    const imgs: string[] = [];
    for (const v of product.variants) {
      for (const opt of v.options ?? []) {
        if (Array.isArray(opt.images)) {
          for (const img of opt.images) {
            if (img && !imgs.includes(img)) imgs.push(img);
          }
        }
      }
    }
    return imgs;
  })();
  const activeGallery = variantGallery && variantGallery.length > 0
    ? variantGallery
    : product.images.length > 0
      ? product.images
      : allVariantImages;
  const hasImages = activeGallery.length > 0;

  /**
   * Delivery promise = today + admin-configured `defaultDeliveryDays` (Settings →
   * Shipping). Falls back to 5 business days when the policy hasn't loaded yet so
   * the badge never renders empty. The previous hard-coded 3 days has been
   * replaced because the admin team needed control over the lead-time copy.
   */
  const deliveryDays = Math.max(1, Math.min(60, marketplacePolicy?.defaultDeliveryDays ?? 5));
  const deliveryDate = new Date(Date.now() + deliveryDays * 86400000).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Marketplace-wide return policy gates the per-PDP return line. Sellers
  // cannot override this — the admin decides whether returns are advertised
  // at all (see Admin → Settings → Return & cancellation).
  const marketplaceReturnsAllowed = marketplacePolicy?.returnPolicy?.isReturnable !== false;
  const productReturnsAllowed = product.isReturnable !== false;
  const showReturnPolicy = marketplaceReturnsAllowed && productReturnsAllowed;
  const effectiveReturnWindow =
    product.returnWindow ?? marketplacePolicy?.returnPolicy?.returnWindow ?? 7;

  // Media gallery: images first, then video (if exists)
  // Use variant video if available, otherwise fall back to product video
  type MediaItem = { type: 'image'; url: string } | { type: 'video'; url: string };
  const activeVideo = variantVideo || product.video;
  const mediaGallery: MediaItem[] = [
    ...activeGallery.map((url): MediaItem => ({ type: 'image', url })),
    ...(activeVideo ? [{ type: 'video' as const, url: activeVideo }] : []),
  ];
  const hasMedia = mediaGallery.length > 0;
  const selectedMedia = mediaGallery[selectedImage] ?? mediaGallery[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm text-text-muted sm:px-6 lg:px-8">
          <Link href="/" className="hover:text-primary-600 transition-colors">Home</Link>
          <ChevronRight size={14} />
          <Link href="/products" className="hover:text-primary-600 transition-colors">Products</Link>
          <ChevronRight size={14} />
          {product.category && (
            <>
              <Link href={`/products?category=${product.category}`} className="hover:text-primary-600 transition-colors capitalize">
                {product.category.replace(/-/g, " ")}
              </Link>
              <ChevronRight size={14} />
            </>
          )}
          <span className="truncate text-text-primary font-medium">{product.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

          {/* ─── Image Gallery ─── */}
          <div className="lg:col-span-5 xl:col-span-5">
            <div className="sticky top-28">
              {/* Main image/video */}
              <motion.div
                className={cn(
                  "relative aspect-square overflow-hidden rounded-2xl border border-border bg-white shadow-sm",
                  selectedMedia?.type !== 'video' && "cursor-crosshair"
                )}
                onMouseEnter={() => selectedMedia?.type !== 'video' && setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={selectedMedia?.type !== 'video' ? handleMouseMove : undefined}
              >
                {/* Hover preview layer — instant swap, no animation (only for images) */}
                {hoverPreviewImage && selectedMedia?.type !== 'video' && (
                  <div className="absolute inset-0 z-10">
                    <Image
                      src={hoverPreviewImage}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-contain p-4"
                      style={isZooming ? { transform: "scale(2)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
                      priority
                    />
                  </div>
                )}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${variantGallery ? 'v' : 'p'}-${selectedImage}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative h-full w-full"
                  >
                    {selectedMedia?.type === 'video' ? (
                      <video
                        src={selectedMedia.url}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                      />
                    ) : hasMedia ? (
                      <Image
                        src={selectedMedia?.url ?? activeGallery[0]}
                        alt={product.name}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-contain p-4"
                        style={isZooming ? { transform: "scale(2)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                        <Package size={48} className="text-gray-300 mb-2" />
                        <span className="text-sm text-text-muted">No image available</span>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                {product.discount > 0 && selectedMedia?.type !== 'video' && (
                  <span className="absolute left-3 top-3 rounded-lg bg-danger-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                    -{product.discount}%
                  </span>
                )}
              </motion.div>

              {/* Thumbnails (images + video) */}
              {mediaGallery.length > 1 && (
                <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                  {mediaGallery.map((media, i) => (
                    <button
                      key={`${variantGallery ? 'v' : 'p'}-${media.type}-${i}`}
                      onClick={() => setSelectedImage(i)}
                      onMouseEnter={() => media.type === 'image' && setSelectedImage(i)}
                      className={cn(
                        "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                        selectedImage === i
                          ? "border-primary-500 ring-2 ring-primary-500/20"
                          : "border-border hover:border-gray-300"
                      )}
                    >
                      {media.type === 'video' ? (
                        <>
                          <video
                            src={media.url}
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                              <Play size={14} className="text-primary-600 ml-0.5" fill="currentColor" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <Image src={media.url} alt={`View ${i + 1}`} fill sizes="64px" className="object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Product Info ─── */}
          <div className="lg:col-span-4 xl:col-span-4">
            <div className="space-y-5">
              {/* Title & brand */}
              <div>
                {product.brand && (
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary-600">{product.brand}</p>
                )}
                <h1 className="text-xl font-bold text-text-primary sm:text-2xl leading-tight">{product.name}</h1>
              </div>

              {/* Ratings */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 rounded-md bg-primary-600 px-2 py-0.5 text-xs font-bold text-white">
                    {product.rating.toFixed(1)} <Star size={10} fill="currentColor" />
                  </div>
                  <span className="text-sm text-text-muted">
                    {product.reviewCount.toLocaleString("en-IN")} ratings
                  </span>
                </div>
                {product.boughtLastMonth > 0 && (
                  <span className="text-sm text-text-muted">
                    {product.boughtLastMonth.toLocaleString("en-IN")}+ bought last month
                  </span>
                )}
              </div>

              <hr className="border-border" />

              {/* Price */}
              <div>
                {effectiveDiscount > 0 && (
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm text-danger-600 font-semibold">-{effectiveDiscount}%</span>
                    <span className="text-sm text-text-muted line-through">M.R.P.: {formatCurrency(mrpIncl)}</span>
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-text-muted">₹</span>
                  <span className="text-3xl font-extrabold text-text-primary">{salePriceIncl.toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-1 text-xs text-primary-600/90">Inclusive of all taxes</p>
              </div>

              <hr className="border-border" />

              {/* Amazon-style service badges */}
              <div className="flex flex-wrap gap-4 text-xs text-center">
                {product.isReplaceable && marketplacePolicy?.returnPolicy?.isReplaceable !== false && (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center">
                      <RefreshCw size={18} className="text-primary-600" />
                    </div>
                    <span className="text-text-secondary font-medium">{effectiveReturnWindow} Days<br/>Replacement</span>
                  </div>
                )}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center">
                    <Truck size={18} className="text-primary-600" />
                  </div>
                  <span className="text-text-secondary font-medium">{product.deliveredBy || "Xelnova"}<br/>Delivered</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center">
                    <Lock size={18} className="text-primary-600" />
                  </div>
                  <span className="text-text-secondary font-medium">Secure<br/>Transaction</span>
                </div>
              </div>

              {/* Delivery info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center shrink-0">
                    <Truck size={16} className="text-success-600" />
                  </div>
                  <span>
                    <strong className="text-text-primary">FREE Delivery</strong>{" "}
                    <span className="text-text-secondary">by {deliveryDate}</span>
                  </span>
                </div>
                {showReturnPolicy ? (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <RotateCcw size={16} className="text-primary-600" />
                    </div>
                    <span className="text-text-secondary">{effectiveReturnWindow} days easy return policy</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      <RotateCcw size={16} className="text-text-muted" />
                    </div>
                    <span className="text-text-secondary">Non-returnable</span>
                  </div>
                )}
                {product.warrantyInfo && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} className="text-primary-600" />
                    </div>
                    <span className="text-text-secondary">{product.warrantyInfo}</span>
                  </div>
                )}
              </div>

              {/* Variants */}
              {augmentedVariants.map((variant) => {
                const isColor = variant.type === "color" || variant.options.some((o) => o.hex || (o.images && o.images.length > 0));
                const isSize = variant.type === "size";
                const hasSizeChart = isSize && variant.sizeChart && variant.sizeChart.length > 0;

                return (
                  <div key={variant.type + variant.label}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-text-primary">
                        {variant.label}:{" "}
                        <span className="font-normal text-text-secondary">
                          {selectedVariants[variant.type]
                            ? variant.options.find((o) => o.value === selectedVariants[variant.type])?.label
                            : "Select"}
                        </span>
                      </p>
                      {hasSizeChart && (
                        <button
                          onClick={() => setSizeChartModal({ label: variant.label, rows: variant.sizeChart! })}
                          className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          <Ruler size={12} />
                          Size Chart
                        </button>
                      )}
                    </div>

                    {/* Color/image variant — hoverable image thumbnails */}
                    {isColor ? (
                      <div
                        className="flex flex-wrap gap-2.5"
                        onMouseLeave={handleVariantHoverEnd}
                      >
                        {variant.options.map((opt) => {
                          const optDisabled = !opt.available || opt.stock === 0;
                          const isSelected = selectedVariants[variant.type] === opt.value;
                          const hasAnyImage = opt.images && opt.images.length > 0;
                          const thumbImg = opt.images?.[0];
                          return (
                            <button
                              key={opt.value}
                              disabled={optDisabled}
                              onClick={() => handleVariantSelect(variant.type, opt.value, opt)}
                              onMouseEnter={() => !optDisabled && hasAnyImage && handleVariantHover(opt)}
                              className={cn(
                                "group relative flex flex-col items-center rounded-xl border-2 transition-all",
                                optDisabled && "opacity-40 cursor-not-allowed",
                                isSelected
                                  ? "border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/50"
                                  : "border-border hover:border-gray-300 bg-white",
                              )}
                            >
                              {thumbImg ? (
                                <div className="relative h-16 w-16 overflow-hidden rounded-t-lg">
                                  <Image src={thumbImg} alt={opt.label} fill sizes="64px" className="object-cover" />
                                </div>
                              ) : opt.hex ? (
                                <div className="flex h-16 w-16 items-center justify-center rounded-t-lg">
                                  <span
                                    className="h-10 w-10 rounded-full border-2 border-gray-200 shadow-inner"
                                    style={{ background: opt.hex }}
                                  />
                                </div>
                              ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-t-lg bg-gray-50">
                                  <span className="text-xs text-text-muted">{opt.label.slice(0, 2)}</span>
                                </div>
                              )}
                              <div className="w-full px-1.5 py-1 text-center border-t border-border/50">
                                <p className={cn(
                                  "text-[11px] font-medium truncate",
                                  isSelected ? "text-primary-700" : "text-text-secondary"
                                )}>
                                  {opt.label}
                                </p>
                                {opt.price != null && (
                                  <p className="text-[10px] text-text-muted">
                                    ₹{displayPriceIncl(opt.price).toLocaleString("en-IN")}
                                  </p>
                                )}
                                {opt.compareAtPrice != null && opt.price != null && opt.compareAtPrice > opt.price && (
                                  <p className="text-[9px] text-text-muted line-through">
                                    ₹{displayPriceIncl(opt.compareAtPrice).toLocaleString("en-IN")}
                                  </p>
                                )}
                              </div>
                              {opt.stock === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
                                  <span className="text-[10px] font-bold text-danger-600 bg-white/80 px-1.5 py-0.5 rounded">Sold Out</span>
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary-600 flex items-center justify-center shadow">
                                  <Check size={10} className="text-white" strokeWidth={3} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : isSize ? (
                      /* Size variant — chip buttons */
                      <div className="flex flex-wrap gap-2">
                        {variant.options.map((opt) => {
                          const optDisabled = !opt.available || opt.stock === 0;
                          const isSelected = selectedVariants[variant.type] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              disabled={optDisabled}
                              onClick={() => handleVariantSelect(variant.type, opt.value, opt)}
                              className={cn(
                                "relative min-w-[48px] rounded-lg border-2 px-3.5 py-2 text-sm font-semibold transition-all",
                                optDisabled && "opacity-40 cursor-not-allowed",
                                isSelected
                                  ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm"
                                  : "border-border text-text-secondary hover:border-gray-400 bg-white",
                                optDisabled && !isSelected && "bg-gray-50 line-through",
                              )}
                            >
                              {opt.label}
                              {opt.stock === 0 && !optDisabled && (
                                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-danger-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Generic "other" variants — standard buttons */
                      <div className="flex flex-wrap gap-2">
                        {variant.options.map((opt) => {
                          const optDisabled = !opt.available || opt.stock === 0;
                          return (
                            <button
                              key={opt.value}
                              disabled={optDisabled}
                              onClick={() => handleVariantSelect(variant.type, opt.value, opt)}
                              className={cn(
                                "rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all",
                                optDisabled && "opacity-40 cursor-not-allowed line-through",
                                selectedVariants[variant.type] === opt.value
                                  ? "border-primary-500 bg-primary-50 text-primary-700"
                                  : "border-border text-text-secondary hover:border-gray-300",
                              )}
                            >
                              {opt.label}
                              {opt.stock === 0 && <span className="ml-1 text-[10px] text-danger-500">(sold out)</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Buy Box (right sidebar) ─── */}
          <div className="lg:col-span-3 xl:col-span-3">
            <div className="sticky top-28 rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
              {/* Price repeat */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-text-muted">₹</span>
                  <span className="text-2xl font-extrabold text-text-primary">{salePriceIncl.toLocaleString("en-IN")}</span>
                </div>
                {effectiveDiscount > 0 && (
                  <p className="text-xs text-text-muted mt-0.5">
                    M.R.P.: <span className="line-through">{formatCurrency(mrpIncl)}</span>{" "}
                    <span className="text-danger-600 font-semibold">({effectiveDiscount}% off)</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-success-700">
                <Truck size={14} />
                <span className="font-medium">FREE Delivery by {deliveryDate}</span>
              </div>

              {effectiveInStock ? (
                <p className="text-sm font-semibold text-success-700">In Stock</p>
              ) : (
                <p className="text-sm font-semibold text-danger-600">Out of Stock</p>
              )}

              {/* Quantity — always visible; mirrors cart when item is in cart */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-text-muted">Quantity</p>
                <div className="inline-flex items-center rounded-xl border-2 border-primary-200 bg-primary-50/50">
                  <button
                    onClick={handleDecrement}
                    disabled={displayQty <= 1}
                    aria-label="Decrease quantity"
                    className="rounded-l-xl px-3 py-2 text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-[44px] text-center text-sm font-bold text-primary-700">{displayQty}</span>
                  <button
                    onClick={handleIncrement}
                    disabled={displayQty >= maxQty}
                    aria-label="Increase quantity"
                    className="rounded-r-xl px-3 py-2 text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {effectiveStock > 0 && effectiveStock < 20 && effectiveInStock && (
                  <p className="mt-1.5 text-xs text-danger-600 font-medium">
                    Only {effectiveStock} left in stock — order soon
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className={cn(
                    "w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                    isInCart
                      ? "bg-success-600 hover:bg-success-700"
                      : justAdded
                        ? "bg-success-500"
                        : "bg-primary-600 hover:bg-primary-700"
                  )}
                >
                  {isInCart ? (
                    <><ShoppingCart size={16} /> Go to Cart ({cartQty} {cartQty === 1 ? 'item' : 'items'})</>
                  ) : justAdded ? (
                    <><Check size={16} /> Added to Cart</>
                  ) : (
                    product.inStock ? "Add to Cart" : "Out of Stock"
                  )}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!product.inStock}
                  className="w-full rounded-xl bg-accent-500 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-accent-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
              </div>

              {/* Wishlist & Share */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => toggle(product.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition-colors",
                    isInWishlist
                      ? "border-danger-200 bg-danger-50 text-danger-600"
                      : "border-border text-text-secondary hover:text-text-primary hover:bg-gray-50"
                  )}
                >
                  <Heart size={14} fill={isInWishlist ? "currentColor" : "none"} />
                  {isInWishlist ? "Wishlisted" : "Wishlist"}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors"
                >
                  {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
                  {shareCopied ? "Link Copied" : "Share"}
                </button>
              </div>

              {/* Seller info */}
              <div className="rounded-xl bg-gray-50 p-3.5 border border-border">
                <p className="text-xs text-text-muted">Sold by</p>
                {product.seller.slug ? (
                  <Link href={`/stores/${product.seller.slug}`} className="text-sm font-semibold text-primary-700 mt-0.5 inline-block hover:underline">
                    {product.seller.name}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold text-primary-700 mt-0.5">{product.seller.name}</p>
                )}
                {product.seller.rating > 0 ? (
                  <div className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                    <span className="font-medium text-text-primary">{product.seller.rating.toFixed(1)}</span>
                    <Star size={10} className="fill-accent-400 text-accent-400" />
                    <span>seller rating</span>
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-text-muted">
                    <span className="font-medium text-primary-700">New seller</span>
                    <span className="ml-1">on Xelnova</span>
                  </div>
                )}
                <Link
                  href={
                    product.seller.slug
                      ? `/stores/${product.seller.slug}?utm_source=pdp&utm_medium=visit-store`
                      : `/search?seller=${encodeURIComponent(product.seller.name)}`
                  }
                  className="mt-2 flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 py-2.5 text-xs font-bold text-primary-700 hover:from-primary-100 hover:to-primary-200 hover:border-primary-300 transition-all duration-300 shadow-sm hover:shadow-md group"
                >
                  <Store size={14} className="group-hover:scale-110 transition-transform" />
                  Visit the Store
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <div className="mt-10 rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative px-6 py-4 text-sm font-medium transition-colors",
                  activeTab === tab.id ? "text-primary-700" : "text-text-muted hover:text-text-primary"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeProductTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                )}
              </button>
            ))}
          </div>
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === "description" && (
                <motion.div key="desc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  {product.description ? (
                    <BulletText text={product.description} />
                  ) : (
                    <p className="leading-relaxed text-text-secondary">No description available for this product.</p>
                  )}
                </motion.div>
              )}
              {activeTab === "specifications" && (
                <motion.div key="specs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  {Object.keys(product.specifications).length > 0 ? (
                    <table className="w-full">
                      <tbody>
                        {Object.entries(product.specifications).map(([key, value], i) => (
                          <tr key={key} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                            <td className="px-4 py-3 text-sm font-medium text-text-secondary w-1/3">{key}</td>
                            <td className="px-4 py-3 text-sm text-text-primary">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-text-muted">No specifications available.</p>
                  )}
                </motion.div>
              )}
              {activeTab === "product-info" && (
                <ProductInfoTab product={product} />
              )}
              {activeTab === "reviews" && (
                <ReviewsTab product={product} />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ─── Similar Products ─── */}
        {similarProducts.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-5 text-xl font-bold text-text-primary">Similar Products</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 md:gap-4">
              {similarProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Size Chart Modal ─── */}
      <AnimatePresence>
        {sizeChartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSizeChartModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Ruler size={18} className="text-primary-600" />
                  <h3 className="text-lg font-bold text-text-primary">{sizeChartModal.label} Chart</h3>
                </div>
                <button
                  onClick={() => setSizeChartModal(null)}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-x-auto p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-primary-100">
                      <th className="pb-3 pr-4 text-left font-bold text-primary-700">{sizeChartModal.label}</th>
                      {sizeChartModal.rows[0] && Object.keys(sizeChartModal.rows[0].values).map((h) => (
                        <th key={h} className="pb-3 pr-4 text-left font-semibold text-text-primary">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeChartModal.rows.map((row, i) => (
                      <tr key={row.label} className={cn(
                        "border-b border-border/50 last:border-0",
                        i % 2 === 0 ? "bg-gray-50/50" : "bg-white",
                      )}>
                        <td className="py-2.5 pr-4 font-semibold text-text-primary">{row.label}</td>
                        {Object.values(row.values).map((val, j) => (
                          <td key={j} className="py-2.5 pr-4 text-text-secondary">{val || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-primary-600" />
          <span className="font-medium text-text-primary text-sm">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-text-muted" />
        ) : (
          <ChevronDown size={16} className="text-text-muted" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KeyValueTable({ data, title }: { data: Record<string, string>; title?: string }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div>
      {title && <h4 className="text-sm font-medium text-text-primary mb-2">{title}</h4>}
      <table className="w-full">
        <tbody>
          {entries.map(([key, value], i) => (
            <tr key={key} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
              <td className="px-3 py-2 text-sm font-medium text-text-secondary w-1/3">{key}</td>
              <td className="px-3 py-2 text-sm text-text-primary">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Bullet/paragraph renderer used for productDescription, safetyInfo etc.
//
// Sellers compose these fields with up to 5 leading bullets followed by an
// optional free-form paragraph (see BulletListEditor in the seller app).
// Lines starting with •, *, or - are rendered as a clean bulleted list, and
// the remaining lines are rendered as a paragraph below the list so the page
// feels visually structured rather than a single wall of text.
function BulletText({ text }: { text: string }) {
  if (!text) return null;
  const bulletLineRe = /^\s*[•*\-]\s+/;
  const lines = text.split(/\r?\n/);
  const bullets: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (bulletLineRe.test(line)) {
      bullets.push(line.replace(bulletLineRe, '').trim());
      i += 1;
      continue;
    }
    if (line.trim() === '' && bullets.length > 0 && bullets.length < 50) {
      // Skip blank lines while we're still consuming the leading bullet block.
      const next = lines[i + 1];
      if (next !== undefined && bulletLineRe.test(next)) {
        i += 1;
        continue;
      }
    }
    break;
  }
  const rest = lines.slice(i).join('\n').trim();

  if (bullets.length === 0 && !rest) return null;

  return (
    <div className="space-y-3">
      {bullets.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary leading-relaxed">
          {bullets.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
      )}
      {rest && (
        <p className="whitespace-pre-line text-sm text-text-secondary leading-relaxed">{rest}</p>
      )}
    </div>
  );
}

function ProductInfoTab({ product }: { product: any }) {
  return (
    <motion.div 
      key="product-info" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Features & Specs */}
      {product.featuresAndSpecs && Object.keys(product.featuresAndSpecs).length > 0 && (
        <CollapsibleSection title="Features & Specs" icon={FileText} defaultOpen={true}>
          <KeyValueTable data={product.featuresAndSpecs} />
        </CollapsibleSection>
      )}

      {/* Materials & Care */}
      {product.materialsAndCare && Object.keys(product.materialsAndCare).length > 0 && (
        <CollapsibleSection title="Materials & Care" icon={Package}>
          <KeyValueTable data={product.materialsAndCare} />
        </CollapsibleSection>
      )}

      {/* Item Details */}
      {product.itemDetails && Object.keys(product.itemDetails).length > 0 && (
        <CollapsibleSection title="Item Details" icon={FileText}>
          <KeyValueTable data={product.itemDetails} />
        </CollapsibleSection>
      )}

      {/* Additional Details */}
      {product.additionalDetails && Object.keys(product.additionalDetails).length > 0 && (
        <CollapsibleSection title="Additional Details" icon={FileText}>
          <KeyValueTable data={product.additionalDetails} />
        </CollapsibleSection>
      )}

      {/* Product Description */}
      {product.productDescription && (
        <CollapsibleSection title="Product Description" icon={FileText} defaultOpen={true}>
          <BulletText text={product.productDescription} />
        </CollapsibleSection>
      )}

      {/* Safety & Product Resources */}
      {product.safetyInfo && (
        <CollapsibleSection title="Safety & Product Resources" icon={ShieldCheck}>
          <BulletText text={product.safetyInfo} />
        </CollapsibleSection>
      )}

      {/* Regulatory Information */}
      {product.regulatoryInfo && (
        <CollapsibleSection title="Regulatory Information" icon={AlertTriangle}>
          <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
            {product.regulatoryInfo}
          </p>
        </CollapsibleSection>
      )}

      {/* Feedback section */}
      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-text-muted">
          Would you like to{" "}
          <button className="text-primary-600 hover:text-primary-700 underline">
            tell us about a lower price
          </button>
          ?
        </p>
      </div>
    </motion.div>
  );
}

function ReviewsTab({ product }: { product: any }) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [helpfulClicked, setHelpfulClicked] = useState<Set<string>>(new Set());

  const handleSubmit = async () => {
    if (rating === 0) { setError("Please select a rating"); return; }
    setSubmitting(true);
    setError("");
    try {
      const m = typeof document !== "undefined" ? document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/) : null;
      if (m) setAccessToken(decodeURIComponent(m[1]));
      await reviewsApi.createReview({ productId: product.id, rating, title: title || undefined, comment: comment || undefined });
      setShowForm(false);
      setRating(0);
      setTitle("");
      setComment("");
      window.location.reload();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    if (helpfulClicked.has(reviewId)) return;
    try {
      const m = typeof document !== "undefined" ? document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/) : null;
      if (m) setAccessToken(decodeURIComponent(m[1]));
      await reviewsApi.markReviewHelpful(reviewId);
      setHelpfulClicked((prev) => new Set(prev).add(reviewId));
    } catch {}
  };

  return (
    <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 rounded-xl bg-gray-50 p-5 border border-border flex-1">
          <div className="text-center">
            <div className="text-4xl font-extrabold text-text-primary">{product.rating.toFixed(1)}</div>
            <div className="mt-1.5 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className={i < Math.floor(product.rating) ? "fill-accent-400 text-accent-400" : "text-gray-200"} />
              ))}
            </div>
            <p className="mt-1 text-sm text-text-muted">{product.reviewCount.toLocaleString("en-IN")} ratings</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-4 shrink-0 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          Write a Review
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h4 className="text-sm font-bold text-text-primary">Your Review</h4>
          <div>
            <p className="text-sm text-text-secondary mb-2">Rating *</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(s)}>
                  <Star size={24} className={s <= (hoverRating || rating) ? "fill-accent-400 text-accent-400" : "text-gray-300"} />
                </button>
              ))}
            </div>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Review title (optional)"
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write your review..."
            rows={3}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || rating === 0} className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
              {submitting && <Loader2 size={14} className="animate-spin" />} Submit Review
            </button>
          </div>
        </div>
      )}

      {product.reviews.length > 0 ? (
        product.reviews.map((review: any) => (
          <div key={review.id} className="border-b border-border pb-5 last:border-0">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                {review.author.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{review.author}</p>
                {review.verified && (
                  <span className="flex items-center gap-1 text-xs text-success-700">
                    <Check size={10} /> Verified Purchase
                  </span>
                )}
              </div>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className={i < review.rating ? "fill-accent-400 text-accent-400" : "text-gray-200"} />
                ))}
              </div>
              {review.title && <span className="text-sm font-semibold text-text-primary">{review.title}</span>}
            </div>
            <p className="text-xs text-text-muted">Reviewed on {formatDate(review.date)}</p>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{review.content}</p>
            <button
              onClick={() => handleHelpful(review.id)}
              disabled={helpfulClicked.has(review.id)}
              className="mt-2 flex items-center gap-1.5 text-xs text-text-muted hover:text-primary-600 transition-colors disabled:text-primary-600"
            >
              <ThumbsUp size={12} /> Helpful ({(review.helpful || 0) + (helpfulClicked.has(review.id) ? 1 : 0)})
            </button>
          </div>
        ))
      ) : (
        <p className="text-sm text-text-muted">No reviews yet. Be the first to review this product!</p>
      )}
    </motion.div>
  );
}
