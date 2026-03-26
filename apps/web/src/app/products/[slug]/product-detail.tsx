"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Heart, Share2, ShieldCheck, Truck, RotateCcw, ChevronRight,
  Minus, Plus, ThumbsUp, Check, ShoppingCart, Package, Loader2,
} from "lucide-react";
import { cn } from "@xelnova/utils";
import { formatCurrency, formatDate } from "@xelnova/utils";
import { useProductBySlug } from "@/lib/api";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { ProductCard } from "@/components/marketplace/product-card";

type TabId = "description" | "specifications" | "reviews";

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data, loading } = useProductBySlug(slug);
  const product = data?.product ?? null;

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<TabId>("description");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const isInWishlist = useWishlistStore((s) => product ? s.isInWishlist(product.id) : false);

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

  const variantString = Object.entries(selectedVariants).map(([, v]) => v).join("-");

  const handleAddToCart = () => {
    addItem({
      id: `${product.id}-${variantString || "default"}`,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice,
      image: product.images[0] || "",
      variant: variantString || undefined,
      seller: product.seller.name,
    });
  };

  const handleBuyNow = () => { handleAddToCart(); router.push("/cart"); };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "specifications", label: "Specifications" },
    { id: "reviews", label: `Reviews (${product.reviewCount.toLocaleString("en-IN")})` },
  ];

  const hasImages = product.images.length > 0;
  const deliveryDate = new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });

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
              {/* Main image */}
              <motion.div
                className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-white cursor-crosshair shadow-sm"
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleMouseMove}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative h-full w-full"
                  >
                    {hasImages ? (
                      <Image
                        src={product.images[selectedImage]}
                        alt={product.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-contain p-4"
                        style={isZooming ? { transform: "scale(2)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
                        priority
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                        <Package size={48} className="text-gray-300 mb-2" />
                        <span className="text-sm text-text-muted">No image available</span>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                {product.discount > 0 && (
                  <span className="absolute left-3 top-3 rounded-lg bg-danger-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                    -{product.discount}%
                  </span>
                )}
              </motion.div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={cn(
                        "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                        selectedImage === i
                          ? "border-primary-500 ring-2 ring-primary-500/20"
                          : "border-border hover:border-gray-300"
                      )}
                    >
                      <Image src={img} alt={`View ${i + 1}`} fill sizes="64px" className="object-cover" />
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
                {product.comparePrice > product.price && (
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm text-danger-600 font-semibold">-{product.discount}%</span>
                    <span className="text-sm text-text-muted line-through">M.R.P.: {formatCurrency(product.comparePrice)}</span>
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-text-muted">₹</span>
                  <span className="text-3xl font-extrabold text-text-primary">{product.price.toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-1 text-xs text-text-muted">Inclusive of all taxes</p>
              </div>

              <hr className="border-border" />

              {/* Delivery info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <Truck size={16} className="text-primary-600" />
                  </div>
                  <span>
                    <strong className="text-text-primary">FREE Delivery</strong>{" "}
                    <span className="text-text-secondary">by {deliveryDate}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <RotateCcw size={16} className="text-primary-600" />
                  </div>
                  <span className="text-text-secondary">7 days easy return policy</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} className="text-primary-600" />
                  </div>
                  <span className="text-text-secondary">1 Year Manufacturer Warranty</span>
                </div>
              </div>

              {/* Variants */}
              {product.variants.map((variant) => (
                <div key={variant.type}>
                  <p className="mb-2 text-sm font-semibold text-text-primary">
                    {variant.label}:{" "}
                    <span className="font-normal text-text-secondary">
                      {selectedVariants[variant.type]
                        ? variant.options.find((o) => o.value === selectedVariants[variant.type])?.label
                        : "Select"}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map((opt) => (
                      <button
                        key={opt.value}
                        disabled={!opt.available}
                        onClick={() => setSelectedVariants((prev) => ({ ...prev, [variant.type]: opt.value }))}
                        className={cn(
                          "relative rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all",
                          !opt.available && "opacity-40 cursor-not-allowed line-through",
                          selectedVariants[variant.type] === opt.value
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-border text-text-secondary hover:border-gray-300",
                          variant.type === "color" && "flex items-center gap-2 pl-3"
                        )}
                      >
                        {variant.type === "color" && opt.hex && (
                          <span className="h-4 w-4 rounded-full border border-gray-200" style={{ background: opt.hex }} />
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Buy Box (right sidebar) ─── */}
          <div className="lg:col-span-3 xl:col-span-3">
            <div className="sticky top-28 rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
              {/* Price repeat */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-text-muted">₹</span>
                  <span className="text-2xl font-extrabold text-text-primary">{product.price.toLocaleString("en-IN")}</span>
                </div>
                {product.comparePrice > product.price && (
                  <p className="text-xs text-text-muted mt-0.5">
                    M.R.P.: <span className="line-through">{formatCurrency(product.comparePrice)}</span>{" "}
                    <span className="text-danger-600 font-semibold">({product.discount}% off)</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-success-700">
                <Truck size={14} />
                <span className="font-medium">FREE Delivery by {deliveryDate}</span>
              </div>

              {product.inStock ? (
                <p className="text-sm font-semibold text-success-700">In Stock</p>
              ) : (
                <p className="text-sm font-semibold text-danger-600">Out of Stock</p>
              )}

              {/* Quantity */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-text-muted">Quantity</p>
                <div className="inline-flex items-center rounded-xl border border-border bg-gray-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="rounded-l-xl px-3 py-2 text-text-muted hover:text-text-primary hover:bg-gray-100 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-[40px] text-center text-sm font-semibold text-text-primary">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="rounded-r-xl px-3 py-2 text-text-muted hover:text-text-primary hover:bg-gray-100 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {product.stockCount < 20 && product.inStock && (
                  <p className="mt-1.5 text-xs text-danger-600 font-medium">
                    Only {product.stockCount} left in stock — order soon
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {product.inStock ? "Add to Cart" : "Out of Stock"}
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
                <button className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors">
                  <Share2 size={14} /> Share
                </button>
              </div>

              {/* Seller info */}
              <div className="rounded-xl bg-gray-50 p-3.5 border border-border">
                <p className="text-xs text-text-muted">Sold by</p>
                <p className="text-sm font-semibold text-primary-700 mt-0.5">{product.seller.name}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                  <span className="font-medium text-text-primary">{product.seller.rating}</span>
                  <Star size={10} className="fill-accent-400 text-accent-400" />
                  <span>seller rating</span>
                </div>
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
                  <p className="leading-relaxed text-text-secondary whitespace-pre-line">
                    {product.description || "No description available for this product."}
                  </p>
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
              {activeTab === "reviews" && (
                <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  {/* Rating summary */}
                  <div className="flex items-center gap-6 rounded-xl bg-gray-50 p-5 border border-border">
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

                  {/* Individual reviews */}
                  {product.reviews.length > 0 ? (
                    product.reviews.map((review) => (
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
                        <button className="mt-2 flex items-center gap-1.5 text-xs text-text-muted hover:text-primary-600 transition-colors">
                          <ThumbsUp size={12} /> Helpful ({review.helpful})
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-muted">No reviews yet. Be the first to review this product!</p>
                  )}
                </motion.div>
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
    </div>
  );
}
