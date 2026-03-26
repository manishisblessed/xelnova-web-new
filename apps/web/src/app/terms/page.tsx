'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

const sections = [
  { title: '1. Introduction', content: 'Welcome to Xelnova. These Terms and Conditions govern your use of our website and services. By accessing or using our website, you agree to be bound by these Terms. If you do not agree with any part of these Terms, please do not use our platform.' },
  { title: '2. Account Registration', content: 'To use certain features of our website, you may be required to create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding the password associated with your account and for any activities or actions under your account.' },
  { title: '3. Product Information', content: 'We attempt to be as accurate as possible in the description of the products. However, we do not warrant that product descriptions or other content of this site is accurate, complete, reliable, current, or error-free. If a product offered by Xelnova itself is not as described, your sole remedy is to return it in unused condition.' },
  { title: '4. Pricing and Payment', content: 'All prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. We reserve the right to change prices at any time without notice. Payment must be made through the available payment methods at checkout. We use secure third-party payment processors and never store your card details.' },
  { title: '5. Shipping and Delivery', content: 'Delivery times are estimates and commence from the date of shipping, rather than the date of order. Delivery times are to be used as a guide only and are subject to the acceptance and approval of your order. Free shipping is available on orders over ₹499. We partner with leading logistics providers to ensure safe and timely delivery.' },
  { title: '6. Returns and Refunds', content: 'We offer a 7-day return policy for most products. Please review our Return & Refund Policy for detailed information on eligibility, process, and timelines. Certain categories of products may have different return windows which will be specified on the product page.' },
  { title: '7. Intellectual Property', content: 'All content on this website, including text, graphics, logos, button icons, images, audio clips, digital downloads, and data compilations, is the property of Xelnova or its content suppliers and is protected by Indian and international copyright laws.' },
  { title: '8. Limitation of Liability', content: 'Xelnova shall not be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the services.' },
  { title: '9. Governing Law', content: 'These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.' },
  { title: '10. Changes to Terms', content: 'We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of the platform after any changes constitutes acceptance of the new Terms.' },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-primary-900 to-surface-dark py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <FileText size={14} /> Legal
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Terms & Conditions</h1>
            <p className="text-sm text-white/70">Last updated: March 2026</p>
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
          <div className="space-y-8">
            {sections.map((s, i) => (
              <motion.section
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-border/60 p-6 md:p-8 shadow-card"
              >
                <h2 className="text-lg font-bold text-text-primary font-display mb-3">{s.title}</h2>
                <p className="text-sm text-text-secondary leading-relaxed">{s.content}</p>
              </motion.section>
            ))}
          </div>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs text-text-muted text-center mt-12">
            If you have questions about these Terms, please <Link href="/contact" className="text-primary-600 hover:underline">contact us</Link>.
          </motion.p>
        </div>
      </section>
    </div>
  );
}
