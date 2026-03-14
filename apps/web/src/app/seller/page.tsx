'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users, IndianRupee, ShieldCheck, Zap, Store, Package, Truck,
  BarChart3, Headphones, ArrowRight, ChevronDown, Globe,
  TrendingUp, Award,
} from 'lucide-react';
import { useState } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const stats = [
  { icon: Users, value: '10M+', label: 'Active Customers' },
  { icon: Store, value: '50K+', label: 'Sellers' },
  { icon: Globe, value: '500+', label: 'Cities' },
  { icon: Headphones, value: '24/7', label: 'Support' },
];

const benefits = [
  { icon: Users, title: 'Massive Customer Base', desc: 'Access millions of active buyers across India looking for products like yours.', color: 'bg-primary-50 text-primary-600' },
  { icon: IndianRupee, title: 'Low Commission', desc: 'Competitive commission rates to maximize your profits and grow faster.', color: 'bg-accent-50 text-accent-600' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: 'Timely payouts with secure payment processing and fraud protection.', color: 'bg-info-50 text-info-600' },
  { icon: Zap, title: 'Easy to Start', desc: 'Simple registration process and intuitive seller dashboard to manage everything.', color: 'bg-success-50 text-success-600' },
  { icon: Truck, title: 'Logistics Support', desc: 'Integrated shipping partners for hassle-free delivery and returns.', color: 'bg-danger-50 text-danger-500' },
  { icon: BarChart3, title: 'Marketing Tools', desc: 'Promotional campaigns, featured listings, and analytics to boost sales.', color: 'bg-accent-50 text-accent-700' },
];

const steps = [
  { num: '01', title: 'Register', desc: 'Create your seller account with business details', icon: Store },
  { num: '02', title: 'Verify', desc: 'Upload documents and complete verification', icon: ShieldCheck },
  { num: '03', title: 'List Products', desc: 'Add your products with images and descriptions', icon: Package },
  { num: '04', title: 'Start Selling', desc: 'Receive orders and grow your business', icon: TrendingUp },
];

const sellerFaqs = [
  { q: 'What are the fees to sell on Xelnova?', a: 'We charge a competitive commission on each sale, which varies by category (typically 5-20%). There are no listing fees or monthly subscription charges.' },
  { q: 'How do I receive payments?', a: 'Payments are transferred directly to your registered bank account on a weekly basis after successful delivery of orders.' },
  { q: 'What documents do I need to register?', a: 'You\'ll need PAN card, GST certificate (if applicable), business registration documents, address proof, and bank account details.' },
  { q: 'How long does verification take?', a: 'Verification typically takes 2-3 business days after you submit all required documents. You\'ll be notified via email once approved.' },
];

function SellerFAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-border/60 overflow-hidden shadow-card">
      <button onClick={() => setOpen(!open)} className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-surface-raised transition-colors">
        <span className="font-medium text-text-primary pr-4">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-text-muted flex-shrink-0" />
        </motion.div>
      </button>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-6 pb-4">
          <p className="text-sm text-text-secondary leading-relaxed">{a}</p>
        </motion.div>
      )}
    </div>
  );
}

export default function SellerLandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-primary-900 to-surface-dark py-24 md:py-36">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
              <span className="inline-flex items-center gap-2 bg-primary-500/20 px-4 py-1.5 rounded-full text-xs font-medium text-primary-300 mb-6">
                <Award size={14} /> #1 Marketplace for Sellers
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white font-display mb-6 leading-tight">
                Grow Your Business with <span className="text-gradient-accent" style={{ WebkitTextFillColor: 'transparent', background: 'linear-gradient(135deg, #ffad20, #f98d07)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>Xelnova</span>
              </h1>
              <p className="text-lg text-white/50 mb-8 max-w-lg leading-relaxed">
                Reach millions of customers across India and scale your business with our trusted marketplace. Start selling in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/seller/register" className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-primary-700 transition-all shadow-primary active:scale-[0.98]">
                  Start Selling Now <ArrowRight size={18} />
                </Link>
                <Link href="/seller/dashboard" className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 px-8 py-4 rounded-xl font-bold text-base hover:bg-white/20 transition-all">
                  Seller Login
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="hidden md:block">
              <div className="relative rounded-3xl overflow-hidden aspect-square max-w-[480px] mx-auto">
                <Image src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=600&fit=crop" alt="Sell on Xelnova" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-extrabold text-white font-display">₹2.5L+</p>
                        <p className="text-[11px] text-white/50">Avg. monthly seller earnings</p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-white font-display">3 Days</p>
                        <p className="text-[11px] text-white/50">Quick account setup</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 -mt-12">
        <div className="mx-auto max-w-[1440px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl border border-border/60 shadow-elevated p-8 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, i) => (
              <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary-50 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-3xl font-extrabold text-text-primary font-display">{stat.value}</div>
                <div className="text-sm text-text-muted mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Advantages</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary font-display">Why Sell on Xelnova?</h2>
            <p className="text-text-muted mt-3">Everything you need to succeed online</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl ${b.color} flex items-center justify-center mb-4`}>
                  <b.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-text-primary font-display mb-2">{b.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-surface-muted">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Process</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary font-display">How It Works</h2>
            <p className="text-text-muted mt-3">Start selling in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-center relative"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-600 flex items-center justify-center shadow-primary">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs font-bold text-primary-600 font-display">Step {step.num}</span>
                <h3 className="text-lg font-bold text-text-primary font-display mt-1 mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary font-display">Seller FAQ</h2>
          </div>
          <div className="space-y-3">
            {sellerFaqs.map((faq) => (
              <SellerFAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.06]">
              <div className="absolute top-0 right-1/3 w-80 h-80 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-accent-400 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-extrabold text-white font-display mb-4">Ready to Start Selling?</h2>
              <p className="text-white/50 mb-8 max-w-lg mx-auto text-lg">Join thousands of successful sellers on Xelnova today</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/seller/register" className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 px-10 py-4 rounded-xl font-bold text-base hover:bg-primary-50 transition-all shadow-lg">
                  Register Now — It&apos;s Free <ArrowRight size={18} />
                </Link>
                <Link href="/contact" className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 px-10 py-4 rounded-xl font-bold text-base hover:bg-white/20 transition-all">
                  Contact Sales Team
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
