'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  TrendingUp,
  Package,
  Truck,
  Shield,
  Users,
  BarChart3,
  Wallet,
  Clock,
  CheckCircle2,
  Star,
  ChevronRight,
  ChevronDown,
  Zap,
  Globe,
  Headphones,
  IndianRupee,
  Boxes,
  BadgePercent,
  CircleDollarSign,
  Sparkles,
  ArrowUpRight,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Play,
  Target,
  Rocket,
  Award,
  ShieldCheck,
  CreditCard,
  LayoutDashboard,
  Camera,
  Tags,
  LineChart,
  Megaphone,
} from 'lucide-react';

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
};

const stats = [
  { value: 10000, suffix: '+', label: 'Active Sellers', icon: Users, description: 'Growing every day' },
  { value: 25000, suffix: '+', label: 'Pincodes Covered', icon: Globe, description: 'Pan-India delivery' },
  { value: 500000, suffix: '+', label: 'Monthly Orders', icon: Package, description: 'And counting' },
  { value: 99, suffix: '%', label: 'On-Time Payments', icon: Wallet, description: 'Within 7 days' },
];

const benefits = [
  {
    icon: TrendingUp,
    title: 'Scale to Millions of Buyers',
    description: 'Get instant access to our growing customer base across India. Our sellers see an average of 3x revenue growth in their first year.',
    stat: '3x',
    statLabel: 'avg. revenue growth',
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-50 to-teal-50',
  },
  {
    icon: BadgePercent,
    title: 'Industry-Low Commission',
    description: 'Keep more of what you earn. Our commission rates start at just 2% — significantly lower than other major platforms.',
    stat: '2%',
    statLabel: 'starting commission',
    gradient: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-50 to-indigo-50',
  },
  {
    icon: Truck,
    title: 'End-to-End Logistics',
    description: 'From doorstep pickup to last-mile delivery — we handle it all. Free pickup from your location, real-time tracking, and hassle-free returns.',
    stat: '25K+',
    statLabel: 'pincodes served',
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-50 to-purple-50',
  },
  {
    icon: IndianRupee,
    title: 'Fastest Payments in Industry',
    description: 'Get paid within 7 days of delivery, directly to your bank account. No delays, no excuses — your money, on time, every time.',
    stat: '7 Days',
    statLabel: 'payment cycle',
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-50 to-orange-50',
  },
  {
    icon: BarChart3,
    title: 'Smart Seller Dashboard',
    description: 'Real-time analytics on sales, inventory, customer behavior, and market trends. Make data-driven decisions to optimize your business.',
    stat: 'Real-time',
    statLabel: 'business insights',
    gradient: 'from-cyan-500 to-blue-600',
    bgGradient: 'from-cyan-50 to-blue-50',
  },
  {
    icon: Headphones,
    title: 'Dedicated Seller Support',
    description: 'A personal account manager for your business, plus 24/7 support via chat, email, and phone. We succeed when you succeed.',
    stat: '24/7',
    statLabel: 'support available',
    gradient: 'from-rose-500 to-pink-600',
    bgGradient: 'from-rose-50 to-pink-50',
  },
];

const steps = [
  {
    step: 1,
    title: 'Create Your Account',
    description: 'Sign up with your GSTIN, PAN, and bank details. Our guided registration takes under 10 minutes.',
    icon: ShieldCheck,
    detail: 'Quick KYC verification',
  },
  {
    step: 2,
    title: 'List Your Products',
    description: 'Upload your catalog with our bulk-upload tools. Add high-quality photos, descriptions, and competitive pricing.',
    icon: Camera,
    detail: 'Bulk upload available',
  },
  {
    step: 3,
    title: 'Start Receiving Orders',
    description: 'Customers discover your products through search, recommendations, and ads. Get instant notifications for every order.',
    icon: Sparkles,
    detail: 'Smart product discovery',
  },
  {
    step: 4,
    title: 'Ship & Get Paid',
    description: 'We pick up from your doorstep. Track every shipment in real-time. Money hits your bank within 7 days of delivery.',
    icon: Rocket,
    detail: 'Doorstep pickup',
  },
];

const commissionStructure = [
  { category: 'Electronics & Gadgets', rate: '2% – 5%', icon: '📱' },
  { category: 'Fashion & Apparel', rate: '5% – 10%', icon: '👕' },
  { category: 'Home & Kitchen', rate: '4% – 8%', icon: '🏠' },
  { category: 'Beauty & Personal Care', rate: '3% – 7%', icon: '✨' },
  { category: 'Sports & Fitness', rate: '4% – 8%', icon: '⚽' },
  { category: 'Books & Stationery', rate: '2% – 5%', icon: '📚' },
  { category: 'Grocery & Essentials', rate: '2% – 4%', icon: '🛒' },
  { category: 'Toys & Baby Products', rate: '4% – 8%', icon: '🧸' },
];

const platformComparison = [
  { feature: 'Starting Commission', xelnova: 'From 2%', others: 'From 5-15%' },
  { feature: 'Payment Cycle', xelnova: '7 Days', others: '14-30 Days' },
  { feature: 'Registration Fee', xelnova: 'Free', others: '₹500 - ₹5,000' },
  { feature: 'Logistics Pickup', xelnova: 'Free Doorstep', others: 'Paid / Self-ship' },
  { feature: 'Seller Dashboard', xelnova: 'Advanced Analytics', others: 'Basic Reports' },
  { feature: 'Account Manager', xelnova: 'Dedicated', others: 'Shared / None' },
  { feature: 'Listing Fees', xelnova: 'Zero', others: '₹10-50 per listing' },
  { feature: 'Return Handling', xelnova: 'Managed by Us', others: 'Seller Managed' },
];

const sellerTools = [
  { icon: LayoutDashboard, title: 'Seller Dashboard', description: 'Complete business overview at a glance' },
  { icon: Camera, title: 'Product Studio', description: 'AI-powered photo editing & cataloging' },
  { icon: Tags, title: 'Smart Pricing', description: 'Dynamic pricing recommendations' },
  { icon: LineChart, title: 'Analytics Suite', description: 'Deep insights into your business' },
  { icon: Boxes, title: 'Inventory Manager', description: 'Never go out of stock again' },
  { icon: Megaphone, title: 'Ad Platform', description: 'Boost visibility with targeted ads' },
];

const categories = [
  'Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports', 'Books',
  'Toys', 'Grocery', 'Health', 'Automotive', 'Garden', 'Pet Supplies',
];

const faqs = [
  {
    q: 'How much does it cost to start selling on Xelnova?',
    a: 'Absolutely nothing. Registration is free, listing is free, and there are no monthly subscription fees. You only pay a small commission when you make a sale — starting from just 2%.',
  },
  {
    q: 'How quickly will I receive my payments?',
    a: 'We process payments within 7 days of successful delivery. The amount is directly transferred to your registered bank account. You can track all your earnings in real-time on the Seller Dashboard.',
  },
  {
    q: 'Do I need a GST number to sell?',
    a: 'Yes, a GSTIN is required for selling on Xelnova as per Indian e-commerce regulations. If you don\'t have one yet, we can guide you through the process — it typically takes 7-10 working days.',
  },
  {
    q: 'How does shipping and logistics work?',
    a: 'We handle everything. Once an order is placed, our logistics partner picks up the package from your doorstep. We manage packaging guidelines, real-time tracking, delivery, and even returns. You focus on your products.',
  },
  {
    q: 'Can I sell across all of India?',
    a: 'Yes! Xelnova delivers to 25,000+ pincodes across India. Whether your customer is in Mumbai or a tier-3 town, we ensure delivery. You can also choose to sell in specific regions if you prefer.',
  },
  {
    q: 'What kind of support do sellers get?',
    a: 'Every seller gets a dedicated account manager, access to 24/7 support via chat, email, and phone, plus free access to Seller University with training resources, webinars, and growth strategies.',
  },
];

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      variants={fadeInUp}
      className="border border-gray-200/80 rounded-2xl overflow-hidden hover:border-primary-200 transition-colors duration-300"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left group"
      >
        <span className="text-lg font-semibold text-gray-900 pr-8 group-hover:text-primary-700 transition-colors">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors"
        >
          <ChevronDown size={18} className="text-primary-600" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-6 pb-6 text-gray-600 leading-relaxed">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SellerLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.96]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ─── Navigation ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-b border-gray-100/80'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image src="/xelnova-logo-dark.png" alt="Xelnova" width={160} height={40} className="h-8 w-auto" priority />
              <div className="h-6 w-px bg-gray-300 mx-1" />
              <span className="text-sm font-bold tracking-wide text-primary-600 uppercase">Seller</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {[
                { label: 'Benefits', href: '#benefits' },
                { label: 'How it Works', href: '#how-it-works' },
                { label: 'Commission', href: '#pricing' },
                { label: 'Tools', href: '#tools' },
                { label: 'FAQ', href: '#faq' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50/60 transition-all duration-200"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-primary-600 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="group relative px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all duration-300 shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5"
              >
                <span className="flex items-center gap-2">
                  Start Selling
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-gray-100 shadow-xl"
            >
              <div className="px-4 py-6 space-y-1">
                {['Benefits', 'How it Works', 'Commission', 'Tools', 'FAQ'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                  >
                    {item}
                  </a>
                ))}
                <div className="pt-4 space-y-3 border-t border-gray-100 mt-4">
                  <Link href="/login" className="block px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                    Log in
                  </Link>
                  <Link href="/register" className="block px-4 py-3 text-center text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-600/20">
                    Start Selling Free <ArrowRight size={16} className="inline ml-1" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── Hero Section ─── */}
      <section ref={heroRef} className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/80 via-white to-blue-50/50" />
        <div className="absolute inset-0 bg-grid-pattern" />
        <div className="absolute top-20 -left-20 w-[500px] h-[500px] bg-primary-200/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-100/10 rounded-full blur-[150px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100/80 border border-primary-200/50 mb-8"
              >
                <span className="flex h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
                <span className="text-sm font-semibold text-primary-700">Zero registration fee — Start selling today</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold text-gray-900 font-display leading-[1.1] tracking-tight">
                Grow Your Business{' '}
                <span className="relative">
                  <span className="text-gradient-hero">10x Faster</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                    <path d="M2 8.5C50 2 150 2 198 8.5" stroke="url(#underline-gradient)" strokeWidth="3" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="underline-gradient" x1="0" y1="0" x2="200" y2="0">
                        <stop stopColor="#10b981" />
                        <stop offset="1" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>{' '}
                on Xelnova
              </h1>

              <p className="mt-6 text-lg lg:text-xl text-gray-600 leading-relaxed max-w-xl">
                Join <strong className="text-gray-900">10,000+ sellers</strong> who trust Xelnova to reach millions of customers.
                Industry-low commissions from <strong className="text-primary-600">2%</strong>, payments within <strong className="text-primary-600">7 days</strong>, and free logistics pickup.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl shadow-xl shadow-primary-600/25 hover:shadow-2xl hover:shadow-primary-600/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Create Seller Account
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50/50 transition-all duration-300"
                >
                  <Play size={18} className="text-primary-500" />
                  See How It Works
                </a>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-primary-500" />
                  <span>No monthly fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-primary-500" />
                  <span>Free logistics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-primary-500" />
                  <span>Pan-India reach</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="relative">
                {/* Main Dashboard Card */}
                <div className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700/50 overflow-hidden">
                  <div className="absolute inset-0 animate-shimmer" />
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/10 rounded-full blur-[60px]" />

                  <div className="relative space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium">Your Seller Dashboard</p>
                        <p className="text-3xl font-bold text-white mt-1 font-display">₹4,82,500</p>
                        <p className="text-primary-400 text-sm font-medium mt-0.5 flex items-center gap-1">
                          <TrendingUp size={14} /> +28% this month
                        </p>
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                        <TrendingUp size={28} className="text-white" />
                      </div>
                    </div>

                    <div className="h-44 flex items-end gap-1.5">
                      {[35, 48, 42, 58, 52, 72, 65, 78, 70, 88, 82, 95, 88, 100].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ duration: 0.6, delay: 0.6 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                          className="flex-1 bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-md relative group cursor-pointer"
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            ₹{(h * 500).toLocaleString('en-IN')}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/60">
                      <div>
                        <p className="text-2xl font-bold text-white font-display">156</p>
                        <p className="text-xs text-gray-400 mt-0.5">Orders Today</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary-400 font-display">4.8★</p>
                        <p className="text-xs text-gray-400 mt-0.5">Seller Rating</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white font-display">98%</p>
                        <p className="text-xs text-gray-400 mt-0.5">Fulfillment</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Cards */}
                <motion.div
                  initial={{ opacity: 0, x: -20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 1 }}
                  className="absolute -left-6 top-1/4 animate-float"
                >
                  <div className="bg-white rounded-2xl p-4 shadow-elevated border border-gray-100/80">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm">
                        <IndianRupee size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Payment Received</p>
                        <p className="text-xs text-gray-500">₹24,500 credited</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                  className="absolute -right-4 bottom-1/3 animate-float-delayed"
                >
                  <div className="bg-white rounded-2xl p-4 shadow-elevated border border-gray-100/80">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm">
                        <Package size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">New Order!</p>
                        <p className="text-xs text-gray-500">Mumbai, Maharashtra</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.4 }}
                  className="absolute -bottom-4 left-1/4 animate-float-slow"
                >
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-elevated border border-gray-100/80">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-gray-900">4.8</span>
                      <span className="text-xs text-gray-500">(2,340 reviews)</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Trusted By / Stats Bar ─── */}
      <section className="relative py-16 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] mb-4 group-hover:bg-primary-500/10 group-hover:border-primary-500/20 transition-all duration-300">
                  <stat.icon size={26} className="text-primary-400" />
                </div>
                <p className="text-3xl lg:text-4xl font-extrabold text-white font-display">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-gray-300 font-medium mt-1">{stat.label}</p>
                <p className="text-gray-500 text-sm mt-0.5">{stat.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Category Marquee ─── */}
      <section className="py-5 bg-primary-600 overflow-hidden">
        <div className="flex animate-marquee">
          {[...categories, ...categories, ...categories, ...categories].map((cat, i) => (
            <span key={i} className="mx-6 text-white/90 text-sm font-semibold tracking-wide flex items-center gap-2 whitespace-nowrap uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* ─── Benefits Section ─── */}
      <section id="benefits" className="py-20 lg:py-32 bg-white relative">
        <div className="absolute inset-0 bg-dot-pattern opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-semibold mb-6">
              <Sparkles size={14} />
              Why Sell on Xelnova?
            </span>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-gray-900 font-display tracking-tight">
              Everything You Need to{' '}
              <span className="text-gradient-primary">Build & Scale</span>
            </h2>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              From listing to logistics to payments — we give you the complete toolkit to build a thriving online business.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-primary-200/80 transition-all duration-500 hover:shadow-elevated-lg cursor-default"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${benefit.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.gradient} mb-6 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-500`}>
                    <benefit.icon size={26} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 font-display">{benefit.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-5">{benefit.description}</p>
                  <div className="flex items-baseline gap-2 pt-4 border-t border-gray-100 group-hover:border-gray-200/60">
                    <span className="text-2xl font-extrabold text-gray-900 font-display">{benefit.stat}</span>
                    <span className="text-sm text-gray-500 font-medium">{benefit.statLabel}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-6">
              <Target size={14} />
              Simple 4-Step Process
            </span>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-gray-900 font-display tracking-tight">
              From Sign-Up to First Sale in{' '}
              <span className="text-gradient-primary">Under 24 Hours</span>
            </h2>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              We&apos;ve made the onboarding process incredibly simple. No complicated paperwork, no hidden steps.
            </p>
          </motion.div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-[calc(12.5%+28px)] right-[calc(12.5%+28px)] h-[2px] -translate-y-1/2">
              <div className="w-full h-full bg-gradient-to-r from-primary-300 via-primary-400 to-primary-300 rounded-full" />
            </div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-50px' }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="relative group"
                >
                  <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-elevated transition-all duration-500 hover:border-primary-200 hover:-translate-y-1">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/20 font-display">
                        {step.step}
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                        <step.icon size={20} className="text-primary-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 font-display">{step.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{step.description}</p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
                      <CheckCircle2 size={12} />
                      {step.detail}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-14 text-center"
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl shadow-xl shadow-primary-600/20 hover:shadow-2xl hover:shadow-primary-600/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              Start Your Journey Today
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Commission / Pricing Section ─── */}
      <section id="pricing" className="py-20 lg:py-32 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-100/30 rounded-full blur-[120px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-sm font-semibold mb-6">
              <CircleDollarSign size={14} />
              Transparent Pricing
            </span>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-gray-900 font-display tracking-tight">
              Industry-Lowest{' '}
              <span className="text-gradient-primary">Commission Rates</span>
            </h2>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              No hidden fees, no monthly charges, no listing fees. You only pay a small commission when you make a sale.
            </p>
          </motion.div>

          {/* Commission Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto mb-16"
          >
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-elevated overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-5">
                <h3 className="text-xl font-bold text-white font-display">Commission by Category</h3>
                <p className="text-primary-100 text-sm mt-1">Rates vary by product category — always transparent, always fair.</p>
              </div>
              <div className="divide-y divide-gray-100">
                {commissionStructure.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between px-8 py-4 hover:bg-primary-50/40 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="font-medium text-gray-900 group-hover:text-primary-700 transition-colors">{item.category}</span>
                    </div>
                    <span className="font-bold text-primary-600 bg-primary-50 px-4 py-1.5 rounded-full text-sm">{item.rate}</span>
                  </motion.div>
                ))}
              </div>
              <div className="px-8 py-5 bg-gray-50 border-t border-gray-100">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Shield size={14} className="text-primary-500" />
                  Commission is deducted only after successful delivery. No upfront costs.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Platform Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h3 className="text-2xl font-bold text-gray-900 font-display text-center mb-8">
              See How We Compare
            </h3>
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-elevated overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200/80">
                <div className="px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Feature</div>
                <div className="px-6 py-4 text-sm font-semibold text-primary-600 uppercase tracking-wider text-center bg-primary-50/50">Xelnova</div>
                <div className="px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-center">Others</div>
              </div>
              {platformComparison.map((row, i) => (
                <div key={i} className="grid grid-cols-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <div className="px-6 py-4 font-medium text-gray-900 text-sm">{row.feature}</div>
                  <div className="px-6 py-4 text-center bg-primary-50/30">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700">
                      <CheckCircle2 size={15} className="text-primary-500" />
                      {row.xelnova}
                    </span>
                  </div>
                  <div className="px-6 py-4 text-center text-sm text-gray-500">{row.others}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Seller Tools Section ─── */}
      <section id="tools" className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-sm font-semibold mb-6">
              <Zap size={14} />
              Powerful Seller Tools
            </span>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-gray-900 font-display tracking-tight">
              Tools That{' '}
              <span className="text-gradient-primary">Supercharge</span> Your Business
            </h2>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              Everything you need to manage, grow, and optimize your online store — all in one dashboard.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {sellerTools.map((tool, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group flex items-start gap-5 p-6 rounded-2xl border border-gray-100 bg-white hover:border-primary-200 hover:shadow-elevated transition-all duration-500 hover:-translate-y-0.5 cursor-default"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center group-hover:from-primary-100 group-hover:to-primary-200 transition-all duration-300">
                  <tool.icon size={22} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1 font-display">{tool.title}</h3>
                  <p className="text-sm text-gray-600">{tool.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Social Proof / Trust Section ─── */}
      <section className="py-20 lg:py-28 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-pattern opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-sm font-semibold mb-6">
              <Award size={14} />
              Trusted by Sellers
            </span>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-gray-900 font-display tracking-tight">
              Why <span className="text-gradient-primary">10,000+ Sellers</span> Choose Xelnova
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: Shield,
                title: 'Secure & Reliable',
                description: 'Enterprise-grade security for your business data. PCI-DSS compliant payment processing. Your business is safe with us.',
                gradient: 'from-emerald-500 to-teal-600',
              },
              {
                icon: CreditCard,
                title: 'Guaranteed Payments',
                description: 'Never worry about payment delays. Our 7-day payment guarantee ensures your cash flow stays healthy and predictable.',
                gradient: 'from-blue-500 to-indigo-600',
              },
              {
                icon: Rocket,
                title: 'Growth Programs',
                description: 'Access exclusive seller programs, advertising credits, and promotional opportunities to accelerate your business growth.',
                gradient: 'from-violet-500 to-purple-600',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group relative bg-white rounded-3xl p-10 border border-gray-100 hover:border-primary-200/80 transition-all duration-500 hover:shadow-elevated-lg text-center"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                  <item.icon size={30} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 font-display">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-sm font-semibold mb-6">
              <Headphones size={14} />
              Got Questions?
            </span>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-gray-900 font-display tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-5 text-lg text-gray-600">
              Everything you need to know about selling on Xelnova.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
            className="space-y-3"
          >
            {faqs.map((faq, index) => (
              <FAQItem key={index} q={faq.q} a={faq.a} index={index} />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <a
              href="mailto:seller-support@xelnova.in"
              className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700 transition-colors"
            >
              <Mail size={18} />
              Contact our seller support team
              <ArrowRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── Final CTA Section ─── */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-primary-950" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-primary-300 text-sm font-semibold mb-8"
            >
              <Zap size={14} />
              Join 10,000+ sellers growing on Xelnova
            </motion.div>

            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold font-display leading-tight tracking-tight text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]">
              Your Next Chapter{' '}
              <span className="text-emerald-300 sm:text-emerald-200">
                Starts Here
              </span>
            </h2>

            <p className="mt-6 text-lg lg:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed">
              Zero registration fee. Zero listing fee. Zero monthly charges.
              Just create your account and start selling to millions of customers across India.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="group relative inline-flex items-center justify-center gap-2.5 px-10 py-4.5 text-base font-bold rounded-2xl shadow-2xl hover:shadow-[0_20px_60px_-12px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 transition-all duration-300 bg-white text-emerald-800 hover:bg-emerald-50"
              >
                Create Free Seller Account
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform text-emerald-700" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2.5 px-10 py-4.5 text-base font-semibold rounded-2xl border-2 border-white/50 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm hover:bg-white/20 hover:border-white/70 transition-all duration-300"
              >
                Already Selling? Log in
              </Link>
            </div>

            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-slate-300">
              {[
                { icon: Shield, label: 'Secure Platform' },
                { icon: Clock, label: '10-Min Onboarding' },
                { icon: Headphones, label: '24/7 Support' },
                { icon: IndianRupee, label: '7-Day Payments' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-medium">
                  <item.icon size={16} className="text-emerald-400 shrink-0" />
                  <span className="text-slate-200">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative bg-[#030712] border-t border-emerald-900/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: brand + link columns */}
          <div className="pt-16 pb-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-10 gap-8 lg:gap-10">
            <div className="col-span-2 lg:col-span-3">
              <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
                <Image src="/xelnova-logo-white.png" alt="Xelnova" width={140} height={36} className="h-7 w-auto" />
              </Link>
              <p className="text-[#94a3b8] text-sm leading-relaxed max-w-xs">
                India&apos;s fastest-growing e-commerce platform empowering sellers to build and scale their businesses online.
              </p>
            </div>

            <div className="lg:col-span-2">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-5">Sell on Xelnova</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'How to Sell', href: '#how-it-works' },
                  { label: 'Fees & Pricing', href: '#pricing' },
                  { label: 'Seller Policies', href: '/policies' },
                  { label: 'Seller Tools', href: '#tools' },
                  { label: 'Fulfillment', href: '/fulfillment' },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-[#94a3b8] hover:text-emerald-400 text-sm transition-colors duration-200">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-5">Resources</h4>
              <ul className="space-y-2.5">
                {['Seller University', 'Help Center', 'Community Forum', 'Success Stories', 'Blog'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[#94a3b8] hover:text-emerald-400 text-sm transition-colors duration-200">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-5">Company</h4>
              <ul className="space-y-2.5">
                {['About Xelnova', 'Careers', 'Press', 'Investors', 'Contact Us'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[#94a3b8] hover:text-emerald-400 text-sm transition-colors duration-200">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact strip — full-width row so nothing gets cramped */}
          <div className="py-8 border-t border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest shrink-0">Seller support</h4>
              <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
                <a
                  href="mailto:seller-support@xelnova.in"
                  className="flex items-center gap-3 group"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20">
                    <Mail size={16} />
                  </span>
                  <span>
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">Email</span>
                    <span className="block text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      seller-support@xelnova.in
                    </span>
                  </span>
                </a>

                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20">
                    <Phone size={16} />
                  </span>
                  <span>
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">Toll-free</span>
                    <span className="block text-sm font-semibold text-white">1800-XXX-XXXX</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-slate-400 ring-1 ring-white/10">
                    <Clock size={16} />
                  </span>
                  <span>
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">Hours</span>
                    <span className="block text-sm font-medium text-[#cbd5e1]">Mon–Sat, 9 AM – 9 PM IST</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="py-6 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[#64748b] text-sm">
              © {new Date().getFullYear()} Xelnova. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Sitemap'].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-[#94a3b8] hover:text-white text-sm transition-colors duration-200"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
