'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Headphones, Search, Package, CreditCard, RotateCcw, User,
  Truck, ShieldCheck, MessageCircle, Phone, Mail, ArrowRight,
  HelpCircle, Clock,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const topics = [
  { icon: Package, title: 'Orders & Delivery', desc: 'Track, modify, or cancel your orders', href: '/faq', color: 'bg-primary-50 text-primary-600' },
  { icon: RotateCcw, title: 'Returns & Refunds', desc: 'Initiate returns and check refund status', href: '/returns', color: 'bg-accent-50 text-accent-600' },
  { icon: CreditCard, title: 'Payments', desc: 'Payment methods, failed transactions, invoices', href: '/faq', color: 'bg-info-50 text-info-600' },
  { icon: User, title: 'My Account', desc: 'Profile, addresses, password, and preferences', href: '/account/profile', color: 'bg-success-50 text-success-600' },
  { icon: Truck, title: 'Shipping Info', desc: 'Delivery timelines, charges, and coverage', href: '/shipping', color: 'bg-danger-50 text-danger-500' },
  { icon: ShieldCheck, title: 'Security', desc: 'Account security and fraud prevention', href: '/security', color: 'bg-accent-50 text-accent-700' },
];

const contactOptions = [
  { icon: Phone, title: 'Call Us', desc: '+91 9259131155', sub: 'Mon–Sat, 9AM–6PM IST', color: 'bg-primary-600' },
  { icon: Mail, title: 'Email Us', desc: 'support@xelnova.in', sub: 'We reply within 24 hours', color: 'bg-accent-600' },
  { icon: MessageCircle, title: 'Live Chat', desc: 'Chat with our team', sub: 'Available 24/7', color: 'bg-info-600' },
];

const quickActions = [
  { label: 'Track my order', href: '/track-order', icon: Package },
  { label: 'Start a return', href: '/returns', icon: RotateCcw },
  { label: 'View FAQ', href: '/faq', icon: HelpCircle },
  { label: 'Contact us', href: '/contact', icon: MessageCircle },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Headphones size={14} /> Help Centre
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white font-display mb-4">How Can We Help?</h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">Search our help centre or browse topics below.</p>
            <div className="max-w-lg mx-auto relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
              <input
                type="text"
                placeholder="Search for help..."
                className="w-full bg-white/[0.07] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition-all"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="relative z-10 -mt-10 md:-mt-12 pb-2">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <motion.ul
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
          >
            {quickActions.map((action, idx) => (
              <motion.li
                key={action.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + idx * 0.06 }}
              >
                <Link
                  href={action.href}
                  className="group flex h-full min-h-[118px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-white px-4 py-5 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100/90 transition-colors group-hover:bg-primary-100 group-hover:text-primary-700">
                    <action.icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="font-display text-sm font-semibold leading-snug text-text-primary transition-colors group-hover:text-primary-600 sm:text-[0.9375rem]">
                    {action.label}
                  </span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* Help Topics */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary font-display">Browse by Topic</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic, i) => (
              <motion.div key={topic.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Link href={topic.href} className="group block bg-white rounded-2xl border border-border/60 p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl ${topic.color} flex items-center justify-center mb-4`}>
                    <topic.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-text-primary font-display mb-1 group-hover:text-primary-600 transition-colors">{topic.title}</h3>
                  <p className="text-sm text-text-secondary">{topic.desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 mt-3 group-hover:gap-2 transition-all">
                    Learn More <ArrowRight size={12} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16 bg-surface-muted">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary font-display mb-3">Need More Help?</h2>
            <p className="text-text-muted">Our support team is available through multiple channels.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactOptions.map((opt, i) => (
              <motion.div
                key={opt.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card text-center hover:shadow-card-hover transition-all"
              >
                <div className={`w-12 h-12 mx-auto rounded-xl ${opt.color} flex items-center justify-center mb-4`}>
                  <opt.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-text-primary font-display mb-1">{opt.title}</h3>
                <p className="text-sm text-text-primary font-medium">{opt.desc}</p>
                <p className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1"><Clock size={11} /> {opt.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
