'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Store, ArrowRight, Lock, BarChart3, Package, ShoppingCart,
  IndianRupee, TrendingUp,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const dashboardFeatures = [
  { icon: IndianRupee, title: 'Sales Analytics', desc: 'Track your revenue, orders, and growth metrics in real-time with interactive charts.' },
  { icon: Package, title: 'Product Management', desc: 'Add, edit, and manage your product listings with bulk upload support.' },
  { icon: ShoppingCart, title: 'Order Management', desc: 'Process orders, manage shipping, and handle returns from one place.' },
  { icon: BarChart3, title: 'Performance Reports', desc: 'Detailed reports on your sales, conversion rates, and customer analytics.' },
  { icon: TrendingUp, title: 'Growth Tools', desc: 'Coupons, promotions, and featured listing tools to boost your visibility.' },
  { icon: Store, title: 'Store Customization', desc: 'Customize your seller profile, brand page, and product presentation.' },
];

export default function SellerDashboardPage() {
  return (
    <div className="min-h-screen bg-surface-raised">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-primary-900 to-surface-dark py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white/60" />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white font-display mb-4">Seller Dashboard</h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto mb-8">
              Log in to access your seller dashboard and manage your business.
            </p>
            <div className="max-w-sm mx-auto space-y-4">
              <input
                type="email"
                placeholder="Email address"
                className="w-full bg-white/[0.07] border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-white/[0.07] border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
              <button className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-primary">
                Sign In to Dashboard
              </button>
              <p className="text-xs text-white/30 text-center">
                Don&apos;t have a seller account?{' '}
                <Link href="/seller/register" className="text-primary-300 hover:underline">Register here</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Features Preview */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Dashboard Features</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary font-display">Everything You Need to Manage Your Business</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-bold text-text-primary font-display mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-10 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.06]">
              <div className="absolute top-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-2xl font-extrabold text-white font-display mb-3">Not a Seller Yet?</h2>
              <p className="text-white/50 mb-6">Join 50,000+ sellers and start growing your business today.</p>
              <Link href="/seller/register" className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-50 transition-all shadow-lg">
                Register Now <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
