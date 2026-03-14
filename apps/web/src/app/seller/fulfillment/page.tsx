'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Package, Truck, Warehouse, ArrowRight, CheckCircle2,
  Clock, MapPin, Shield, BarChart3, ArrowLeft, Zap,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const fulfillmentOptions = [
  {
    title: 'Fulfilled by Xelnova (FBX)',
    badge: 'Recommended',
    desc: 'Send your inventory to our warehouse. We handle storage, packing, shipping, and returns.',
    features: ['Same/next-day delivery eligible', 'Professional packaging', 'Easy returns handling', 'Lower shipping costs', 'Prime-like badge on listings'],
    icon: Warehouse,
    color: 'border-primary-300 bg-primary-50/30',
  },
  {
    title: 'Self-Fulfilled',
    badge: '',
    desc: 'You store, pack, and ship products yourself. Full control over the fulfillment process.',
    features: ['Use your own packaging', 'Choose your courier partner', 'Xelnova integrated partners available', 'Flexible for custom products', 'Lower fulfillment fees'],
    icon: Package,
    color: 'border-border/60 bg-white',
  },
];

const howItWorks = [
  { icon: Package, title: 'Send Inventory', desc: 'Ship your products to the nearest Xelnova fulfillment center.' },
  { icon: Warehouse, title: 'We Store It', desc: 'Products are stored safely in our climate-controlled warehouses.' },
  { icon: Clock, title: 'Order Received', desc: 'When a customer orders, our team picks, packs, and ships the product.' },
  { icon: Truck, title: 'Fast Delivery', desc: 'Customer receives the product with Xelnova\'s trusted delivery experience.' },
];

const benefits = [
  { icon: Zap, title: 'Faster Delivery', desc: 'Products stored in our warehouses qualify for express and same-day delivery options.' },
  { icon: Shield, title: 'Damage Protection', desc: 'Inventory is insured while in our fulfillment centers. We handle damaged items.' },
  { icon: BarChart3, title: 'Better Conversions', desc: 'FBX products see up to 30% higher conversion rates due to faster shipping badges.' },
  { icon: MapPin, title: 'Pan-India Reach', desc: 'Our fulfillment network covers 500+ cities for quick delivery across India.' },
];

const fulfillmentCenters = [
  { city: 'Mumbai', area: 'Bhiwandi' },
  { city: 'Delhi NCR', area: 'Manesar' },
  { city: 'Bengaluru', area: 'Hosur Road' },
  { city: 'Hyderabad', area: 'Shamshabad' },
  { city: 'Kolkata', area: 'Dankuni' },
  { city: 'Chennai', area: 'Sriperumbudur' },
];

export default function FulfillmentPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Warehouse size={14} /> Logistics
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Fulfillment Services</h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto">Let Xelnova handle your logistics so you can focus on growing your business.</p>
          </motion.div>
        </div>
      </section>

      {/* Fulfillment Options */}
      <section className="py-16 -mt-10">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {fulfillmentOptions.map((opt, i) => (
              <motion.div
                key={opt.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className={`rounded-2xl border p-8 shadow-card ${opt.color} relative`}
              >
                {opt.badge && (
                  <span className="absolute top-4 right-4 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    {opt.badge}
                  </span>
                )}
                <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center mb-5">
                  <opt.icon className="w-7 h-7 text-primary-700" />
                </div>
                <h3 className="text-xl font-bold text-text-primary font-display mb-2">{opt.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-5">{opt.desc}</p>
                <ul className="space-y-2.5">
                  {opt.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <CheckCircle2 size={16} className="text-primary-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How FBX Works */}
      <section className="py-16 bg-surface-muted">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Process</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary font-display">How Fulfilled by Xelnova Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-600 flex items-center justify-center shadow-primary">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs font-bold text-primary-600 font-display">Step {i + 1}</span>
                <h3 className="text-lg font-bold text-text-primary font-display mt-1 mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary font-display">Why Choose FBX?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card text-center hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                  <b.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-bold text-text-primary font-display mb-2">{b.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fulfillment Centers */}
      <section className="py-16 bg-surface-muted">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-text-primary font-display mb-3">Our Fulfillment Network</h2>
            <p className="text-text-muted">Strategically located warehouses across India for fastest delivery.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {fulfillmentCenters.map((fc, i) => (
              <motion.div
                key={fc.city}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="bg-white rounded-xl border border-border/60 p-5 shadow-card flex items-center gap-3"
              >
                <MapPin size={18} className="text-primary-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-text-primary text-sm">{fc.city}</p>
                  <p className="text-xs text-text-muted">{fc.area}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/seller" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary-600 transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Sell on Xelnova
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-10 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.06]">
              <div className="absolute top-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-2xl font-extrabold text-white font-display mb-3">Ready to Get Started?</h2>
              <p className="text-white/50 mb-6">Register as a seller and start using our fulfillment services today.</p>
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
