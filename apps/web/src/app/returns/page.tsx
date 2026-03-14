'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  RotateCcw, ArrowLeft, Package, CreditCard, Truck, MessageCircle,
  CheckCircle2, Clock, AlertCircle, ArrowRight,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const steps = [
  { icon: Package, title: 'Initiate Return', desc: 'Go to \'My Orders\' and select the item you want to return within 7 days of delivery.' },
  { icon: Truck, title: 'Schedule Pickup', desc: 'Choose a convenient pickup slot. Our logistics partner will collect the item from your doorstep.' },
  { icon: CheckCircle2, title: 'Quality Check', desc: 'Once received, we inspect the item to ensure it meets return eligibility criteria.' },
  { icon: CreditCard, title: 'Get Refund', desc: 'Refund is processed within 5-7 business days to your original payment method.' },
];

const policies = [
  { title: 'Returns', icon: RotateCcw, content: 'You have 7 calendar days to return an item from the date you received it. To be eligible for a return, your item must be unused and in the same condition that you received it. Your item must be in the original packaging with all tags and accessories included.', color: 'bg-primary-50 text-primary-600' },
  { title: 'Refunds', icon: CreditCard, content: 'Once we receive your item, we will inspect it and notify you that we have received your returned item. We will immediately notify you on the status of your refund after inspecting the item. If your return is approved, we will initiate a refund to your credit card or original method of payment. You will receive the credit within 5-7 business days.', color: 'bg-accent-50 text-accent-600' },
  { title: 'Shipping', icon: Truck, content: 'For quality-related returns, we provide free reverse pickup. For change-of-mind returns, a shipping fee of ₹49 will be deducted from your refund. If you receive a damaged or incorrect item, return shipping is completely free.', color: 'bg-info-50 text-info-600' },
];

const nonReturnable = [
  'Innerwear and lingerie',
  'Beauty products (opened/used)',
  'Customized or personalized items',
  'Perishable goods',
  'Digital downloads',
  'Gift cards',
];

export default function ReturnsPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-primary-900 to-surface-dark py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute top-0 left-1/3 w-80 h-80 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <RotateCcw size={14} /> Policies
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Returns & Refunds</h1>
            <p className="text-lg text-white/50">Hassle-free returns within 7 days of delivery</p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 -mt-10">
        <div className="mx-auto max-w-[1440px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl border border-border/60 shadow-elevated p-8 md:p-10"
          >
            <h2 className="text-xl font-bold text-text-primary font-display mb-8 text-center">How Returns Work</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <motion.div key={step.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center relative">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-primary-100 hidden lg:block last:hidden" style={{ display: i === 3 ? 'none' : undefined }} />
                  <h3 className="font-bold text-text-primary font-display mb-1">{step.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Policy Details */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary-600 transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <div className="space-y-6">
            {policies.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-border/60 p-6 md:p-8 shadow-card"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center flex-shrink-0`}>
                    <p.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary font-display mb-3">{p.title}</h2>
                    <p className="text-sm text-text-secondary leading-relaxed">{p.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Non-Returnable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-8 bg-accent-50 border border-accent-200 rounded-2xl p-6 md:p-8"
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" />
              <h3 className="font-bold text-text-primary font-display">Non-Returnable Items</h3>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
              {nonReturnable.map((item) => (
                <li key={item} className="text-sm text-text-secondary flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 bg-surface-muted rounded-2xl p-8 text-center"
          >
            <MessageCircle className="w-10 h-10 text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text-primary font-display mb-2">Need Help with a Return?</h3>
            <p className="text-sm text-text-muted mb-6">Our support team is available to assist you with the return process.</p>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary">
              Contact Support <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
