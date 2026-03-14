"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Heart, Share2, ShieldCheck, Truck, RotateCcw, ChevronRight,
  Minus, Plus, ThumbsUp, Check, ShoppingCart,
} from "lucide-react";
import { cn } from "@xelnova/utils";
import { formatCurrency, formatDate } from "@xelnova/utils";
import { products } from "@/lib/data/products";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { ProductCard } from "@/components/marketplace/product-card";

type TabId = "description" | "specifications" | "reviews";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const product = products.find((p) => p.slug === slug);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<TabId>("description");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const isInWishlist = useWishlistStore((s) => product ? s.isInWishlist(product.id) : false);

  const similarProducts = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  }, [product]);

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-950 px-4 text-center">
        <ShoppingCart size={64} className="mb-4 text-surface-300" />
        <h1 className="text-2xl font-bold text-white">Product Not Found</h1>
        <p className="mt-2 text-surface-100">The product you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/products" className="mt-6 rounded-xl bg-gold-400 px-6 py-3 text-sm font-semibold text-surface-950 hover:bg-gold-300">Browse Products</Link>
      </div>
    );
  }

  const variantString = Object.entries(selectedVariants).map(([, v]) => v).join("-");

  const handleAddToCart = () => {
    addItem({ id: `${product.id}-${variantString || "default"}`, productId: product.id, name: product.name, slug: product.slug, price: product.price, comparePrice: product.comparePrice, image: product.images[0], variant: variantString || undefined, seller: product.seller.name });
  };

  const handleBuyNow = () => { handleAddToCart(); router.push("/cart"); };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "specifications", label: "Specifications" },
    { id: "reviews", label: `Reviews (${product.reviewCount.toLocaleString("en-IN")})` },
  ];

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Breadcrumb */}
      <div className="border-b border-surface-300/30 bg-surface-900">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm text-surface-100 sm:px-6 lg:px-8">
          <Link href="/" className="hover:text-gold-400 transition-colors">Home</Link>
          <ChevronRight size={14} />
          <Link href="/products" className="hover:text-gold-400 transition-colors">Products</Link>
          <ChevronRight size={14} />
          <Link href={`/products?category=${product.category}`} className="hover:text-gold-400 transition-colors capitalize">{product.category.replace("-", " & ")}</Link>
          <ChevronRight size={14} />
          <span className="truncate text-white font-medium">{product.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Image Gallery */}
          <div className="lg:col-span-3">
            <div className="sticky top-28">
              <motion.div
                className="relative mb-4 aspect-square overflow-hidden rounded-2xl border border-surface-300/50 bg-surface-800 cursor-crosshair"
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleMouseMove}
              >
                <AnimatePresence mode="wait">
                  <motion.div key={selectedImage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="relative h-full w-full">
                    <Image
                      src={product.images[selectedImage]}
                      alt={product.name}
                      fill
                      className="object-contain p-4"
                      style={isZooming ? { transform: "scale(2)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
                      priority
                    />
                  </motion.div>
                </AnimatePresence>
                {product.discount > 0 && (
                  <span className="absolute left-4 top-4 rounded-lg bg-gradient-to-r from-danger-500 to-danger-600 px-3 py-1.5 text-sm font-bold text-white shadow">-{product.discount}%</span>
                )}
              </motion.div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                      selectedImage === i ? "border-gold-400 shadow-glow-sm" : "border-surface-300/50 hover:border-surface-200"
                    )}
                  >
                    <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-surface-300/50 bg-surface-800 p-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gold-400">{product.brand}</p>
              <h1 className="text-xl font-bold text-white sm:text-2xl font-display">{product.name}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5 rounded-md bg-success-600/20 px-2 py-0.5 text-sm font-bold text-success-400">
                    {product.rating.toFixed(1)} <Star size={12} fill="currentColor" />
                  </div>
                  <span className="text-sm text-surface-100">{product.reviewCount.toLocaleString("en-IN")} ratings</span>
                </div>
                {product.boughtLastMonth > 0 && (
                  <span className="text-sm text-surface-100">{product.boughtLastMonth.toLocaleString("en-IN")}+ bought last month</span>
                )}
              </div>

              <hr className="my-4 border-surface-300/30" />

              {/* Price */}
              <div className="mb-1">
                {product.comparePrice > product.price && (
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm text-danger-400 font-medium">-{product.discount}%</span>
                    <span className="text-sm text-surface-100 line-through">M.R.P.: {formatCurrency(product.comparePrice)}</span>
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-surface-100">₹</span>
                  <span className="text-3xl font-bold text-white">{product.price.toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-1 text-xs text-surface-100">Inclusive of all taxes</p>
              </div>

              <hr className="my-4 border-surface-300/30" />

              {/* Delivery */}
              <div className="mb-5 space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <Truck size={16} className="text-gold-400" />
                  <span><strong className="text-white">FREE Delivery</strong> <span className="text-surface-100">by Thursday, Mar 15</span></span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <RotateCcw size={16} className="text-gold-400" />
                  <span className="text-surface-100">7 days easy return policy</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <ShieldCheck size={16} className="text-gold-400" />
                  <span className="text-surface-100">1 Year Manufacturer Warranty</span>
                </div>
              </div>

              {/* Variants */}
              {product.variants.map((variant) => (
                <div key={variant.type} className="mb-4">
                  <p className="mb-2 text-sm font-semibold text-white">
                    {variant.label}: <span className="font-normal text-surface-100">{selectedVariants[variant.type] ? variant.options.find((o) => o.value === selectedVariants[variant.type])?.label : "Select"}</span>
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
                            ? "border-gold-400 bg-gold-400/10 text-gold-400"
                            : "border-surface-300 text-surface-50 hover:border-surface-200",
                          variant.type === "color" && "flex items-center gap-2 pl-3"
                        )}
                      >
                        {variant.type === "color" && opt.hex && (
                          <span className="h-4 w-4 rounded-full border border-surface-300" style={{ background: opt.hex }} />
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quantity */}
              <div className="mb-5">
                <p className="mb-2 text-sm font-semibold text-white">Quantity</p>
                <div className="inline-flex items-center rounded-xl border border-surface-300 bg-surface-700">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="rounded-l-xl px-3 py-2 text-surface-100 hover:text-white hover:bg-surface-600 transition-colors"><Minus size={16} /></button>
                  <span className="min-w-[48px] text-center text-sm font-semibold text-white">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(10, quantity + 1))} className="rounded-r-xl px-3 py-2 text-surface-100 hover:text-white hover:bg-surface-600 transition-colors"><Plus size={16} /></button>
                </div>
                {product.stockCount < 20 && product.inStock && (
                  <p className="mt-1.5 text-xs text-danger-400 font-medium">Only {product.stockCount} left in stock — order soon</p>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button onClick={handleAddToCart} disabled={!product.inStock} className="w-full rounded-xl bg-gold-400 py-3.5 text-sm font-bold text-surface-950 shadow-sm transition-all hover:bg-gold-300 hover:shadow-glow active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
                  {product.inStock ? "Add to Cart" : "Out of Stock"}
                </button>
                <button onClick={handleBuyNow} disabled={!product.inStock} className="w-full rounded-xl bg-gold-700 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-gold-600 hover:shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
                  Buy Now
                </button>
              </div>

              {/* Wishlist & Share */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => toggle(product.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors",
                    isInWishlist ? "border-danger-500/30 bg-danger-500/10 text-danger-400" : "border-surface-300 text-surface-100 hover:text-white hover:bg-surface-700"
                  )}
                >
                  <Heart size={16} fill={isInWishlist ? "currentColor" : "none"} />
                  {isInWishlist ? "Wishlisted" : "Add to Wishlist"}
                </button>
                <button className="flex items-center justify-center gap-2 rounded-xl border border-surface-300 px-4 py-2.5 text-sm font-medium text-surface-100 hover:text-white hover:bg-surface-700 transition-colors">
                  <Share2 size={16} /> Share
                </button>
              </div>

              {/* Seller */}
              <div className="mt-5 rounded-xl bg-surface-700 p-4 border border-surface-300/30">
                <p className="text-sm text-surface-100">Sold by <span className="font-semibold text-gold-400">{product.seller.name}</span></p>
                <div className="mt-1 flex items-center gap-1 text-sm text-surface-100">
                  <span className="font-medium text-white">{product.seller.rating}</span>
                  <Star size={12} className="fill-gold-400 text-gold-400" />
                  <span>seller rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-10 rounded-2xl border border-surface-300/50 bg-surface-800">
          <div className="flex border-b border-surface-300/30">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn("relative px-6 py-4 text-sm font-medium transition-colors", activeTab === tab.id ? "text-gold-400" : "text-surface-100 hover:text-white")}
              >
                {tab.label}
                {activeTab === tab.id && <motion.div layoutId="activeProductTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-400" />}
              </button>
            ))}
          </div>
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === "description" && (
                <motion.div key="desc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <p className="leading-relaxed text-surface-50 whitespace-pre-line">{product.description}</p>
                </motion.div>
              )}
              {activeTab === "specifications" && (
                <motion.div key="specs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <table className="w-full">
                    <tbody>
                      {Object.entries(product.specifications).map(([key, value], i) => (
                        <tr key={key} className={i % 2 === 0 ? "bg-surface-700/50" : "bg-transparent"}>
                          <td className="px-4 py-3 text-sm font-medium text-surface-100 w-1/3">{key}</td>
                          <td className="px-4 py-3 text-sm text-white">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
              {activeTab === "reviews" && (
                <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <div className="flex items-center gap-6 rounded-xl bg-surface-700/50 p-5 border border-surface-300/30">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white">{product.rating.toFixed(1)}</div>
                      <div className="mt-1 flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (<Star key={i} size={16} className={i < Math.floor(product.rating) ? "fill-gold-400 text-gold-400" : "text-surface-300"} />))}
                      </div>
                      <p className="mt-1 text-sm text-surface-100">{product.reviewCount.toLocaleString("en-IN")} ratings</p>
                    </div>
                  </div>
                  {product.reviews.map((review) => (
                    <div key={review.id} className="border-b border-surface-300/20 pb-5 last:border-0">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-400/10 text-xs font-bold text-gold-400">{review.author.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-medium text-white">{review.author}</p>
                          {review.verified && <span className="flex items-center gap-1 text-xs text-success-400"><Check size={10} />Verified Purchase</span>}
                        </div>
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => (<Star key={i} size={14} className={i < review.rating ? "fill-gold-400 text-gold-400" : "text-surface-300"} />))}</div>
                        <span className="text-sm font-semibold text-white">{review.title}</span>
                      </div>
                      <p className="text-xs text-surface-100">Reviewed on {formatDate(review.date)}</p>
                      <p className="mt-2 text-sm leading-relaxed text-surface-50">{review.content}</p>
                      <button className="mt-2 flex items-center gap-1.5 text-xs text-surface-100 hover:text-gold-400 transition-colors"><ThumbsUp size={12} />Helpful ({review.helpful})</button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 text-xl font-bold text-white font-display">Similar Products</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similarProducts.map((p, i) => (<ProductCard key={p.id} product={p} index={i} />))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
