'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FileText, ArrowLeft, ShieldCheck, IndianRupee, Package,
  RotateCcw, AlertTriangle, Truck, Scale, Users,
} from 'lucide-react';

const policies = [
  { icon: ShieldCheck, title: '1. Seller Code of Conduct', content: 'All sellers must maintain professional conduct, provide accurate product descriptions, ship orders within the committed timeframe, and respond to customer queries within 24 hours. Sellers must not engage in any misleading practices, fake reviews, or counterfeit product sales.' },
  { icon: IndianRupee, title: '2. Commission & Fees', content: 'Xelnova charges a category-based commission on each sale, typically ranging from 5% to 20%. There are no listing fees, monthly subscriptions, or hidden charges. Commission rates are detailed in your seller dashboard under the "Fee Schedule" section.' },
  { icon: Package, title: '3. Product Listing Guidelines', content: 'All product listings must include accurate descriptions, clear images (minimum 3 per product), correct pricing in INR, and proper categorization. Prohibited items include counterfeit goods, hazardous materials, weapons, and any items violating Indian law.' },
  { icon: Truck, title: '4. Shipping & Fulfillment', content: 'Sellers must ship orders within 2 business days of confirmation. Xelnova provides integrated logistics partners, but sellers may also use their own shipping. All shipments must include a valid tracking number. Delayed shipments may result in penalties.' },
  { icon: RotateCcw, title: '5. Returns & Refunds', content: 'Sellers must honor Xelnova\'s 7-day return policy. Quality-related returns are at the seller\'s cost. For buyer\'s remorse returns, shipping costs are deducted from the buyer\'s refund. Sellers must process return approvals within 48 hours.' },
  { icon: IndianRupee, title: '6. Payment Terms', content: 'Payments are settled on a weekly basis (every Tuesday) for orders delivered in the previous week. A minimum payout threshold of ₹100 applies. Payments are made directly to your registered bank account via NEFT/IMPS.' },
  { icon: Scale, title: '7. Dispute Resolution', content: 'In case of disputes between seller and buyer, Xelnova acts as a mediator. Sellers can raise disputes through the dashboard within 7 days. Final decisions are made by the Xelnova resolution team based on evidence provided by both parties.' },
  { icon: AlertTriangle, title: '8. Account Suspension', content: 'Xelnova reserves the right to suspend or terminate seller accounts for violations including shipping fake products, repeated late shipments, consistently poor customer feedback, or any fraudulent activity. Suspended sellers will be notified via email.' },
  { icon: Users, title: '9. Seller Support', content: 'Dedicated seller support is available Mon-Sat, 9 AM - 6 PM IST via email (sellers@xelnova.in) and phone (1800-123-XELNOVA). Priority support is available for sellers with over ₹5L monthly GMV through a dedicated account manager.' },
];

export default function SellerPoliciesPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-primary-900 to-surface-dark py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <FileText size={14} /> Seller Guidelines
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Seller Policies</h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">Guidelines and policies for selling on Xelnova marketplace.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Link href="/seller" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary-600 transition-colors mb-8">
              <ArrowLeft size={14} /> Back to Sell on Xelnova
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-primary-50 border border-primary-200 rounded-2xl p-6 mb-8"
          >
            <p className="text-sm text-primary-800 leading-relaxed">
              These policies apply to all sellers on the Xelnova marketplace. By registering as a seller, you agree to comply with all guidelines outlined below. Policies are subject to updates — sellers will be notified of any changes via email.
            </p>
          </motion.div>

          <div className="space-y-6">
            {policies.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-border/60 p-6 md:p-8 shadow-card"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <p.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary font-display mb-3">{p.title}</h2>
                    <p className="text-sm text-text-secondary leading-relaxed">{p.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-12 text-center">
            <p className="text-sm text-text-muted mb-4">Last updated: March 2026</p>
            <p className="text-xs text-text-muted">
              Questions about seller policies? <Link href="/contact" className="text-primary-600 hover:underline">Contact our seller support team</Link>.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
