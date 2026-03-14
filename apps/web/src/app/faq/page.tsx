'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, Search, MessageCircle, ArrowRight } from 'lucide-react';

const faqCategories = [
  { id: 'orders', label: 'Orders & Delivery' },
  { id: 'returns', label: 'Returns & Refunds' },
  { id: 'payments', label: 'Payments' },
  { id: 'account', label: 'Account' },
  { id: 'seller', label: 'Selling' },
];

const faqs: Record<string, { q: string; a: string }[]> = {
  orders: [
    { q: 'How do I track my order?', a: 'You can track your order by going to \'My Orders\' in your account section. Click on the specific order to view its detailed tracking status. You\'ll also receive email and SMS updates as your order progresses.' },
    { q: 'What are the delivery charges?', a: 'Delivery is free on orders above ₹499. For orders below ₹499, a flat delivery fee of ₹49 applies. Express delivery options are available at additional charges.' },
    { q: 'Can I change my delivery address after placing an order?', a: 'You can change the delivery address before the order is shipped. Go to \'My Orders\', select the order, and click \'Change Address\'. Once shipped, the address cannot be changed.' },
  ],
  returns: [
    { q: 'What is the return policy?', a: 'We offer a 7-day return policy for most products. If you are not satisfied with your purchase, you can initiate a return from the \'My Orders\' section within 7 days of delivery. The item must be unused and in original packaging.' },
    { q: 'How long do refunds take?', a: 'Once we receive and inspect your returned item, refunds are processed within 5-7 business days. The refund will be credited to your original payment method.' },
    { q: 'Can I exchange a product instead of returning it?', a: 'Yes, for eligible products you can request an exchange for a different size or color. Select \'Exchange\' instead of \'Return\' when initiating the process from your orders page.' },
  ],
  payments: [
    { q: 'How can I pay for my order?', a: 'We accept various payment methods including Credit/Debit Cards (Visa, Mastercard, RuPay), Net Banking, UPI (GPay, PhonePe, Paytm), and Cash on Delivery (COD) for eligible pin codes.' },
    { q: 'Is my payment information secure?', a: 'Absolutely. We use 256-bit SSL encryption and are PCI DSS compliant. Your card details are never stored on our servers. All transactions are processed through secure, certified payment gateways.' },
    { q: 'Can I use multiple payment methods for a single order?', a: 'Currently, only one payment method can be used per order. However, you can combine a coupon or wallet balance with any payment method.' },
  ],
  account: [
    { q: 'How do I create an account?', a: 'Click \'Sign In\' at the top of the page, then select \'Create Account\'. You can register using your email address or phone number. Verify via OTP and you\'re all set!' },
    { q: 'I forgot my password. How do I reset it?', a: 'Click \'Sign In\', then \'Forgot Password\'. Enter your registered email or phone number and we\'ll send you a reset link/OTP to create a new password.' },
    { q: 'How do I update my profile information?', a: 'Go to \'My Account\' > \'Profile\'. From here you can update your name, email, phone number, and manage your saved addresses.' },
  ],
  seller: [
    { q: 'How do I become a seller on Xelnova?', a: 'Click on \'Sell on Xelnova\' in the header or footer. Complete the registration with your business details, upload required documents (PAN, GST if applicable), and start listing products once verified.' },
    { q: 'What are the fees to sell on Xelnova?', a: 'We charge a competitive commission on each sale, which varies by category (typically 5-20%). There are no listing fees or monthly subscription charges.' },
    { q: 'How long does seller verification take?', a: 'Verification typically takes 2-3 business days after you submit all required documents. You\'ll be notified via email once approved.' },
  ],
};

function FAQItem({ q, a, isOpen, onClick }: { q: string; a: string; isOpen: boolean; onClick: () => void }) {
  return (
    <motion.div layout className="border-b border-border/60 last:border-0">
      <button onClick={onClick} className="flex justify-between items-center w-full text-left py-5 px-1 group">
        <span className="font-medium text-text-primary group-hover:text-primary-600 transition-colors pr-4">{q}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-text-muted flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-text-secondary leading-relaxed pb-5 px-1">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('orders');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const currentFaqs = faqs[activeCategory] || [];
  const filteredFaqs = searchQuery
    ? Object.values(faqs).flat().filter((f) => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentFaqs;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <HelpCircle size={14} /> Help Centre
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white font-display mb-4">Frequently Asked Questions</h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">Find quick answers to commonly asked questions.</p>
            <div className="max-w-lg mx-auto relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.07] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Category Sidebar */}
            {!searchQuery && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="md:col-span-1">
                <div className="sticky top-24 space-y-1.5">
                  {faqCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveCategory(cat.id); setOpenIndex(0); }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        activeCategory === cat.id
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* FAQ List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={searchQuery ? 'md:col-span-4 max-w-3xl mx-auto w-full' : 'md:col-span-3'}
            >
              <div className="bg-white rounded-2xl border border-border/60 shadow-card px-6 md:px-8">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, i) => (
                    <FAQItem
                      key={faq.q}
                      q={faq.q}
                      a={faq.a}
                      isOpen={openIndex === i}
                      onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    />
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <HelpCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <p className="text-text-muted">No matching questions found.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Still Need Help */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-surface-muted rounded-3xl p-10 md:p-14 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary-50 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-primary-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary font-display mb-3">Still have questions?</h2>
            <p className="text-text-muted max-w-md mx-auto mb-8">Can&apos;t find the answer you&apos;re looking for? Our support team would be happy to help.</p>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary">
              Contact Support <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
