'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Eye, Cookie, Database, Share2, Mail } from 'lucide-react';

const sections = [
  { icon: Database, title: '1. Information We Collect', content: 'We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This includes your name, email address, phone number, postal address, payment information, and any other information you choose to provide. We also collect certain information automatically when you use our services, such as your IP address, device and browser type, operating system, referral URLs, and information about how you interact with our services.' },
  { icon: Eye, title: '2. How We Use Your Information', content: 'We use the information we collect to provide, maintain, and improve our services, such as to process payments, send receipts, provide products and services you request (and send related information), develop new features, provide customer support, and send product updates and administrative messages. We also use the information to monitor and analyze trends, usage, and activities in connection with our services and personalize your experience.' },
  { icon: Share2, title: '3. Sharing of Information', content: 'We may share the information we collect about you as described in this Policy or as described at the time of collection or sharing, including with third-party vendors, consultants, and other service providers who need access to such information to carry out work on our behalf. We may also share information in response to legal requests or to comply with applicable laws, to protect the rights and property of Xelnova, and with your consent or at your direction.' },
  { icon: Lock, title: '4. Security', content: 'We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. We use 256-bit SSL encryption for data transmission and store sensitive information using industry-standard encryption methods. Access to personal data is restricted to authorized personnel only.' },
  { icon: Cookie, title: '5. Cookies & Tracking', content: 'Most web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove or reject browser cookies. We use cookies and similar technologies to collect information about your browsing activities and to personalize your experience. You can manage your cookie preferences through your browser settings.' },
  { icon: Mail, title: '6. Contact Us', content: 'If you have any questions about this Privacy Policy, please contact us at privacy@xelnova.in. You may also write to us at: Xelnova Marketplace Pvt. Ltd., Buildings Alyssa, Begonia & Clove, Embassy Tech Village, Outer Ring Road, Bengaluru 560103, India.' },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-primary-900 to-surface-dark py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Shield size={14} /> Legal
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Privacy Policy</h1>
            <p className="text-sm text-white/40">Last updated: March 2026</p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary-600 transition-colors mb-8">
              <ArrowLeft size={14} /> Back to Home
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-primary-50 border border-primary-200 rounded-2xl p-6 mb-8"
          >
            <p className="text-sm text-primary-800 leading-relaxed">
              At Xelnova, we take your privacy seriously. This policy describes what personal information we collect, how we use it, and what choices you have. By using our platform, you agree to the collection and use of information in accordance with this policy.
            </p>
          </motion.div>

          <div className="space-y-6">
            {sections.map((s, i) => (
              <motion.section
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-border/60 p-6 md:p-8 shadow-card"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary font-display mb-3">{s.title}</h2>
                    <p className="text-sm text-text-secondary leading-relaxed">{s.content}</p>
                  </div>
                </div>
              </motion.section>
            ))}
          </div>

          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs text-text-muted text-center mt-12">
            Questions about privacy? <Link href="/contact" className="text-primary-600 hover:underline">Contact us</Link>.
          </motion.p>
        </div>
      </section>
    </div>
  );
}
