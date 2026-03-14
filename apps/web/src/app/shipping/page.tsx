'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Truck, Clock, MapPin, Package, Shield, ArrowLeft,
  CheckCircle2, IndianRupee, ArrowRight, MessageCircle,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const highlights = [
  { icon: Truck, title: 'Free Delivery', desc: 'On all orders over ₹499', color: 'bg-primary-50 text-primary-600' },
  { icon: Clock, title: 'Fast Shipping', desc: '2-7 business days delivery', color: 'bg-accent-50 text-accent-600' },
  { icon: MapPin, title: '500+ Cities', desc: 'Pan-India coverage', color: 'bg-info-50 text-info-600' },
  { icon: Shield, title: 'Secure Packaging', desc: 'Tamper-proof and safe', color: 'bg-success-50 text-success-600' },
];

const shippingOptions = [
  { type: 'Standard Delivery', time: '5-7 business days', cost: 'Free on orders above ₹499 (₹49 otherwise)', desc: 'Our standard shipping option covers all serviceable pin codes across India.' },
  { type: 'Express Delivery', time: '2-3 business days', cost: '₹99', desc: 'Available for select pin codes in metro cities. Get your order delivered faster.' },
  { type: 'Same Day Delivery', time: 'Within 24 hours', cost: '₹149', desc: 'Available in select areas of Mumbai, Delhi, Bangalore, and Hyderabad for orders placed before 12 PM.' },
];

const policies = [
  'Delivery times are estimates and commence from the date of shipping, not the date of order.',
  'Orders placed on weekends or public holidays will be processed the next business day.',
  'Multiple items in a single order may be shipped separately from different warehouses.',
  'You will receive tracking details via SMS and email once your order is shipped.',
  'For Cash on Delivery (COD) orders, please keep the exact amount ready at the time of delivery.',
  'In case of delivery failure due to incorrect address, re-delivery charges may apply.',
];

export default function ShippingPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Truck size={14} /> Delivery
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Shipping Information</h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto">Fast, reliable delivery across India with real-time tracking.</p>
          </motion.div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 -mt-10">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {highlights.map((h, i) => (
              <motion.div
                key={h.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card text-center hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 mx-auto rounded-xl ${h.color} flex items-center justify-center mb-3`}>
                  <h.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-text-primary font-display mb-1">{h.title}</h3>
                <p className="text-xs text-text-muted">{h.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Shipping Options */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-extrabold text-text-primary font-display mb-8 text-center">Shipping Options</h2>
          <div className="space-y-4">
            {shippingOptions.map((opt, i) => (
              <motion.div
                key={opt.type}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary font-display">{opt.type}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1 text-xs text-text-muted"><Clock size={12} /> {opt.time}</span>
                      <span className="flex items-center gap-1 text-xs text-primary-600 font-medium"><IndianRupee size={12} /> {opt.cost}</span>
                    </div>
                  </div>
                  <Package className="w-8 h-8 text-primary-200 hidden sm:block" />
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{opt.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="py-16 bg-surface-muted">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-extrabold text-text-primary font-display mb-8 text-center">Shipping Policies</h2>
          <div className="space-y-3">
            {policies.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="flex items-start gap-3 bg-white rounded-xl border border-border/60 p-4 shadow-card"
              >
                <CheckCircle2 className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary leading-relaxed">{p}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary-600 transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-surface-muted rounded-2xl p-8 text-center"
          >
            <MessageCircle className="w-10 h-10 text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text-primary font-display mb-2">Questions About Shipping?</h3>
            <p className="text-sm text-text-muted mb-6">Our support team is ready to help with any delivery-related queries.</p>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary">
              Contact Support <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
