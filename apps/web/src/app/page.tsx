'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  Zap, TrendingUp, Award, ShoppingBag, Eye, Star, Quote,
  Truck, RotateCcw, ShieldCheck, Headphones, Flame, Timer,
  ChevronRight, ArrowRight, Smartphone, Package, Users, Store,
} from 'lucide-react';
import { HeroCarousel } from '@/components/marketplace/hero-carousel';
import { ProductCard } from '@/components/marketplace/product-card';
import { CategoryCard } from '@/components/marketplace/category-card';
import { FlashDealCard } from '@/components/marketplace/flash-deal-card';
import { SectionHeader } from '@/components/marketplace/section-header';
import {
  categories,
  flashDealProducts,
  getBestSellers,
  getRecommended,
  products,
} from '@/lib/data';

const trendingProducts = products.filter((p) => p.isFeatured || p.rating >= 4.5).slice(0, 8);
const bestSellers = getBestSellers();
const recommended = getRecommended();

const trendingSearches = ['iPhone 16', 'Air Jordans', 'Samsung S25', 'PS5 Slim', 'MacBook Air', 'boAt Earbuds', 'Levi\'s Jeans'];

const brands = [
  'Samsung', 'Apple', 'Sony', 'Nike', "Levi's", 'Puma',
  'boAt', 'OnePlus', 'JBL', 'Ray-Ban', 'Prestige', 'Philips',
];

const stats = [
  { icon: Package, value: '50,000+', label: 'Products' },
  { icon: Store, value: '500+', label: 'Trusted Sellers' },
  { icon: Users, value: '10M+', label: 'Happy Customers' },
  { icon: Truck, value: 'FREE', label: 'Delivery over ₹499' },
];

const trustFeatures = [
  { icon: Truck, title: 'Free Delivery', desc: 'On orders over ₹499' },
  { icon: RotateCcw, title: 'Easy Returns', desc: '7-day hassle-free returns' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: '100% protected checkout' },
  { icon: Headphones, title: '24/7 Support', desc: "We're here to help" },
];

const promoBanners = [
  { id: 1, image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=700&h=300&fit=crop', href: '/products?category=fashion', alt: 'Summer Fashion Sale', title: 'Fashion Fest', subtitle: 'Up to 60% Off' },
  { id: 2, image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=700&h=300&fit=crop', href: '/products?category=electronics', alt: 'New Tech Arrivals', title: 'Tech Week', subtitle: 'Latest Gadgets' },
];

const topSelections = [
  { id: 1, title: 'Top Rated Fashion', discount: 'Min. 50% Off', image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=200&h=200&fit=crop', href: '/products?category=fashion' },
  { id: 2, title: 'Best of Gadgets', discount: 'Up to 60% Off', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop', href: '/products?category=electronics' },
  { id: 3, title: 'Premium Footwear', discount: 'Min. 40% Off', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop', href: '/products?category=footwear' },
];

const testimonials = [
  { id: 1, name: 'Priya Sharma', location: 'Mumbai', initials: 'PS', rating: 5, text: 'Amazing quality products! The delivery was super fast and the packaging was premium. Definitely my go-to marketplace now.', color: 'bg-primary-100 text-primary-700' },
  { id: 2, name: 'Rahul Verma', location: 'Delhi', initials: 'RV', rating: 5, text: 'Found brands here that I couldn\'t find anywhere else. The deals are genuine and customer service is top-notch.', color: 'bg-accent-100 text-accent-700' },
  { id: 3, name: 'Anita Patel', location: 'Bangalore', initials: 'AP', rating: 5, text: 'Love the easy returns policy. Ordered electronics worth ₹50K and everything was authentic with warranty cards.', color: 'bg-info-100 text-info-600' },
];

const sidePromos = [
  { image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop', title: 'New Arrivals', subtitle: 'Spring Collection \'26', href: '/products?sort=newest', badge: 'Just In', accent: 'from-primary-500/80 to-primary-700/90' },
  { image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=300&fit=crop', title: 'Clearance', subtitle: 'Up to 80% Off', href: '/products?deals=clearance', badge: 'Last Chance', accent: 'from-accent-500/80 to-accent-700/90' },
];

const dealProduct = products.find((p) => p.discount >= 30 && p.rating >= 4.5) || products[0];

export default function HomePage() {
  return (
    <div className="min-h-screen mesh-hero">

      {/* ─── 1. BENTO HERO GRID ─── */}
      <section className="pt-3 pb-2">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:h-[420px]">
            <div className="lg:col-span-3 h-[220px] sm:h-[300px] lg:h-full">
              <HeroCarousel />
            </div>
            <div className="hidden lg:grid grid-rows-2 gap-3 h-full">
              {sidePromos.map((promo) => (
                <Link key={promo.title} href={promo.href} className="relative rounded-2xl overflow-hidden group">
                  <Image src={promo.image} alt={promo.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${promo.accent}`} />
                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70 mb-1">{promo.badge}</span>
                    <h3 className="text-lg font-bold text-white leading-tight">{promo.title}</h3>
                    <p className="text-xs text-white/70 mt-0.5">{promo.subtitle}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-white mt-2 group-hover:gap-2 transition-all">
                      Shop Now <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. TRENDING SEARCHES ─── */}
      <section className="pb-2">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide py-1">
            <span className="flex-shrink-0 text-xs font-semibold text-text-muted flex items-center gap-1">
              <TrendingUp size={12} className="text-primary-500" /> Trending:
            </span>
            {trendingSearches.map((term) => (
              <Link
                key={term}
                href={`/products?search=${encodeURIComponent(term)}`}
                className="flex-shrink-0 text-xs bg-white border border-border/60 rounded-full px-3.5 py-1.5 text-text-secondary hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. SOCIAL PROOF STATS ─── */}
      <section className="py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 rounded-2xl p-5 md:p-7 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.07]">
              <div className="absolute top-0 left-1/4 w-40 h-40 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-accent-400 rounded-full blur-3xl" />
            </div>
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-2.5">
                    <stat.icon className="w-5 h-5 text-primary-200" />
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-white font-display">{stat.value}</div>
                  <div className="text-xs text-white/50 mt-0.5 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 4. CATEGORIES ─── */}
      <section className="py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-2xl border border-border/60 py-5 px-4 shadow-card"
          >
            <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-8 lg:gap-12 overflow-x-auto scrollbar-hide">
              {categories.map((cat, i) => (
                <CategoryCard key={cat.id} category={cat} index={i} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 5. FLASH DEALS STRIP ─── */}
      <section className="py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl border border-border/60 overflow-hidden shadow-card"
          >
            <div className="flex flex-col md:flex-row">
              <div className="md:w-56 lg:w-64 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 left-4 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
                  <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-accent-400/30 blur-xl" />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 400, delay: 0.2 }}
                  className="relative"
                >
                  <div className="w-12 h-12 rounded-2xl bg-accent-400 flex items-center justify-center mb-4 shadow-accent mx-auto">
                    <Zap className="w-6 h-6 text-white fill-white" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1 leading-tight font-display">Flash Deals</h2>
                  <p className="text-xs text-white/50 mb-5">Limited time offers</p>
                  <Link
                    href="/products?deals=flash"
                    className="inline-flex items-center gap-1.5 bg-white text-primary-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-all shadow-lg shadow-black/10 active:scale-95"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              </div>
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 p-4 min-w-max">
                  {flashDealProducts.map((product) => (
                    <FlashDealCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 6. TRENDING PRODUCTS ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-border/60 p-5 md:p-6 shadow-card">
            <SectionHeader title="Trending Now" subtitle="Products everyone is talking about" seeAllHref="/products?sort=trending" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {trendingProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. PROMO BANNERS ─── */}
      <section className="py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promoBanners.map((banner, i) => (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Link
                  href={banner.href}
                  className="block relative h-44 md:h-52 rounded-2xl overflow-hidden group shadow-card hover:shadow-card-hover transition-all duration-300"
                >
                  <Image src={banner.image} alt={banner.alt} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex items-center px-8">
                    <div>
                      <span className="inline-block text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 mb-1">{banner.subtitle}</span>
                      <h3 className="text-2xl md:text-3xl font-extrabold text-white font-display">{banner.title}</h3>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-white mt-3 group-hover:gap-2 transition-all">
                        Shop Now <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. DEAL OF THE DAY ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative bg-gradient-to-br from-accent-50 via-white to-surface-warm rounded-3xl border border-accent-200/40 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-72 h-72 bg-accent-100/40 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-100/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
            <div className="relative p-6 md:p-10">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="relative aspect-square max-w-[360px] mx-auto">
                  <div className="absolute inset-4 rounded-3xl bg-white shadow-elevated" />
                  <Image
                    src={dealProduct.images[0]}
                    alt={dealProduct.name}
                    fill
                    className="object-contain relative z-10 p-6"
                  />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 bg-danger-100 text-danger-700 px-3 py-1 rounded-full text-xs font-bold mb-4">
                    <Flame size={12} className="fill-current" /> Deal of the Day
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-2 font-display leading-tight">
                    {dealProduct.name}
                  </h2>
                  <p className="text-sm text-text-muted mb-5">{dealProduct.brand} · {dealProduct.rating.toFixed(1)} ★ ({dealProduct.reviewCount.toLocaleString('en-IN')} reviews)</p>
                  <div className="flex items-baseline gap-3 mb-5">
                    <span className="text-3xl font-extrabold text-text-primary">₹{dealProduct.price.toLocaleString('en-IN')}</span>
                    {dealProduct.comparePrice > dealProduct.price && (
                      <>
                        <span className="text-lg text-text-muted line-through">₹{dealProduct.comparePrice.toLocaleString('en-IN')}</span>
                        <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-lg text-sm font-bold">{dealProduct.discount}% OFF</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-3 mb-6">
                    {[
                      { val: '12', label: 'Hours' },
                      { val: '45', label: 'Mins' },
                      { val: '30', label: 'Secs' },
                    ].map((t) => (
                      <div key={t.label} className="bg-surface-dark text-white px-4 py-3 rounded-xl text-center min-w-[56px]">
                        <div className="text-xl font-bold tabular-nums font-display">{t.val}</div>
                        <div className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">{t.label}</div>
                      </div>
                    ))}
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-danger-500 animate-pulse mr-1.5" />
                      <span className="text-xs text-danger-600 font-semibold">Live</span>
                    </div>
                  </div>
                  <Link
                    href={`/products/${dealProduct.slug}`}
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary active:scale-[0.98]"
                  >
                    Shop Now <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 9. BEST SELLERS ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-border/60 p-5 md:p-6 shadow-card">
            <SectionHeader title="Best Sellers" subtitle="Most loved by our customers" seeAllHref="/products?sort=best-selling" />
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {bestSellers.map((product, i) => (
                <div key={product.id} className="w-[220px] flex-shrink-0 sm:w-[240px]">
                  <ProductCard product={product} index={i} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 10. TOP SELECTIONS ─── */}
      <section className="py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeader title="Top Selection" subtitle="Curated picks at great prices" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topSelections.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Link
                  href={item.href}
                  className="group flex items-center gap-5 bg-white border border-border/60 rounded-2xl p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-24 h-24 flex-shrink-0 rounded-xl bg-surface-raised overflow-hidden flex items-center justify-center">
                    <Image src={item.image} alt={item.title} width={96} height={96} className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary group-hover:text-primary-700 transition-colors">{item.title}</h3>
                    <p className="text-sm text-primary-600 font-medium mt-0.5">{item.discount}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted group-hover:text-primary-600 mt-3 transition-all">
                      Shop Now <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 11. RECOMMENDED ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-border/60 p-5 md:p-6 shadow-card">
            <SectionHeader title="Recommended for You" subtitle="Handpicked based on top ratings" seeAllHref="/products" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {recommended.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 12. BRAND SHOWCASE ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeader title="Top Brands" subtitle="Shop from the brands you love" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {brands.map((brand, i) => (
              <motion.div
                key={brand}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Link
                  href={`/products?brand=${encodeURIComponent(brand)}`}
                  className="flex h-20 items-center justify-center rounded-2xl border border-border/60 bg-white px-4 text-center text-sm font-bold text-text-secondary transition-all duration-300 hover:border-primary-300 hover:text-primary-700 hover:shadow-card-hover hover:-translate-y-0.5"
                >
                  {brand}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 13. CUSTOMER TESTIMONIALS ─── */}
      <section className="py-8">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeader title="What Our Customers Say" subtitle="Real reviews from real shoppers" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card hover:shadow-card-hover transition-all duration-300"
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} size={14} className="fill-accent-400 text-accent-400" />
                  ))}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-5">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${review.color}`}>
                    {review.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{review.name}</p>
                    <p className="text-xs text-text-muted">{review.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 14. APP DOWNLOAD CTA ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative bg-gradient-to-r from-primary-700 via-primary-800 to-surface-dark rounded-3xl p-8 md:p-12 overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.04]">
              <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-accent-400 rounded-full blur-3xl" />
            </div>
            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs text-white/60 mb-4 font-medium">
                  <Smartphone size={12} /> Available on iOS & Android
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3 font-display leading-tight">
                  Shop Anytime,<br />Anywhere
                </h2>
                <p className="text-white/50 mb-6 max-w-md text-sm leading-relaxed">
                  Download the Xelnova app and get <strong className="text-accent-300">₹200 off</strong> on your first order. Exclusive app-only deals await!
                </p>
                <div className="flex gap-3 justify-center md:justify-start">
                  <button className="flex items-center gap-2.5 bg-white text-text-primary px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition shadow-lg">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302-2.302 2.302-2.78-2.302 2.78-2.302zM5.864 2.658L16.8 9.082l-2.302 2.302L5.864 2.658z"/></svg>
                    Google Play
                  </button>
                  <button className="flex items-center gap-2.5 bg-white/10 text-white border border-white/20 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-white/20 transition">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    App Store
                  </button>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center">
                <div className="w-48 h-72 bg-white/5 rounded-[2rem] border border-white/10 p-2 relative">
                  <div className="w-full h-full bg-gradient-to-b from-primary-500/50 to-primary-700/50 rounded-[1.5rem] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                        <ShoppingBag className="w-7 h-7 text-white" />
                      </div>
                      <p className="text-white font-bold text-base font-display">Xelnova</p>
                      <p className="text-white/40 text-[10px] mt-0.5">Shop smart</p>
                    </div>
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-surface-dark rounded-b-xl" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 15. TRUST FEATURES ─── */}
      <section className="border-t border-border bg-white py-10 mt-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12"
          >
            {trustFeatures.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="text-center group"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 group-hover:scale-110 transition-all duration-300">
                  <item.icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-text-primary text-sm">{item.title}</h3>
                <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 16. RECENTLY VIEWED ─── */}
      <section className="py-6 pb-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeader title="Recently Viewed" />
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-white py-14 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-surface-raised p-4">
                <Eye size={28} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted">Start browsing to see recently viewed products</p>
              <Link
                href="/products"
                className="mt-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 shadow-primary"
              >
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
