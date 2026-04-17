'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Shield, Lock, Eye, Fingerprint, Server, AlertTriangle,
  CheckCircle2, ArrowLeft,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const features = [
  { icon: Lock, title: '256-bit SSL Encryption', desc: 'All data transmitted between your browser and our servers is encrypted using industry-standard SSL/TLS protocols.', color: 'bg-primary-50 text-primary-600' },
  { icon: Shield, title: 'PCI DSS Compliance', desc: 'We are fully PCI DSS compliant, meaning your card details are handled with the highest security standards.', color: 'bg-info-50 text-info-600' },
  { icon: Fingerprint, title: 'Two-Factor Authentication', desc: 'Add an extra layer of security to your account with OTP-based two-factor authentication.', color: 'bg-accent-50 text-accent-600' },
  { icon: Server, title: 'Secure Data Storage', desc: 'Personal data is stored in encrypted databases with regular security audits and penetration testing.', color: 'bg-success-50 text-success-600' },
  { icon: Eye, title: 'Privacy Controls', desc: 'You have full control over your personal data. View, export, or delete your information at any time.', color: 'bg-danger-50 text-danger-600' },
  { icon: AlertTriangle, title: 'Fraud Protection', desc: 'Advanced AI-powered fraud detection systems monitor every transaction to protect you from unauthorized activity.', color: 'bg-accent-50 text-accent-700' },
];

const tips = [
  'Never share your password or OTP with anyone, including Xelnova representatives.',
  'Use a strong, unique password with a mix of letters, numbers, and symbols.',
  'Enable two-factor authentication for additional account security.',
  'Always log out of your account when using shared or public devices.',
  'Verify the website URL starts with https://xelnova.in before entering credentials.',
  'Report suspicious emails or messages claiming to be from Xelnova immediately.',
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-primary-900 to-surface-dark py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Shield size={14} /> Your Safety
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Security at Xelnova</h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">Your safety is our top priority. Here&apos;s how we protect you.</p>
          </motion.div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 -mt-10">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text-primary font-display mb-2">{f.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Tips */}
      <section className="py-16 bg-surface-muted">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary font-display mb-3">Stay Safe Online</h2>
            <p className="text-text-muted">Follow these tips to keep your account and personal information secure.</p>
          </motion.div>
          <div className="space-y-3">
            {tips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="flex items-start gap-3 bg-white rounded-xl border border-border/60 p-4 shadow-card"
              >
                <CheckCircle2 className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary leading-relaxed">{tip}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Report */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary-600 transition-colors mb-8">
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <p className="text-sm text-text-muted">
              Found a security vulnerability? Please report it to <a href="mailto:security@xelnova.in" className="text-primary-600 hover:underline">security@xelnova.in</a>.
              We take all reports seriously and will respond within 24 hours.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
