'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Newspaper, Calendar, ArrowRight, Download, Mail, ExternalLink } from 'lucide-react';

const pressReleases = [
  { date: 'March 2026', title: 'Xelnova Launches Same-Day Delivery in 4 Metro Cities', desc: 'Xelnova announced the launch of same-day delivery service in Mumbai, Delhi, Bangalore, and Hyderabad, expanding its logistics capabilities.' },
  { date: 'February 2026', title: 'Xelnova Crosses 10 Million Customer Milestone', desc: 'India\'s fastest-growing marketplace celebrated reaching 10 million registered customers within its first two years of operation.' },
  { date: 'January 2026', title: 'Xelnova Introduces AI-Powered Product Recommendations', desc: 'The marketplace launched its new AI engine that personalizes product suggestions based on browsing behavior and purchase history.' },
  { date: 'December 2025', title: 'Xelnova Partners with 500+ Sellers Across India', desc: 'The platform reached a landmark of 500 verified sellers, offering over 50,000 products across electronics, fashion, and home categories.' },
  { date: 'October 2025', title: 'Xelnova Launches Seller Protection Program', desc: 'A new program designed to protect sellers from fraudulent returns and provide guaranteed payment timelines.' },
  { date: 'August 2025', title: 'Xelnova Expands to 500+ Cities', desc: 'With partnerships with leading logistics providers, Xelnova now delivers to over 500 cities and towns across India.' },
];

const mediaCoverage = [
  { outlet: 'Economic Times', title: 'Xelnova: The New Age Marketplace Disrupting Indian E-Commerce', date: 'Feb 2026' },
  { outlet: 'YourStory', title: 'How Xelnova is Building Trust in Online Shopping', date: 'Jan 2026' },
  { outlet: 'Inc42', title: 'Xelnova\'s Growth Strategy: Quality Over Quantity', date: 'Dec 2025' },
];

export default function PressPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-primary-900 to-surface-dark py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute top-0 right-1/3 w-80 h-80 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/85 mb-6">
              <Newspaper size={14} /> Newsroom
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Press & Media</h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">Latest news, press releases, and media coverage about Xelnova.</p>
          </motion.div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-extrabold text-text-primary font-display mb-8">Press Releases</h2>
          <div className="space-y-4">
            {pressReleases.map((pr, i) => (
              <motion.div
                key={pr.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card hover:shadow-card-hover transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={13} className="text-text-muted" />
                  <span className="text-xs text-text-muted font-medium">{pr.date}</span>
                </div>
                <h3 className="text-lg font-bold text-text-primary font-display group-hover:text-primary-600 transition-colors mb-2">{pr.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{pr.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Coverage */}
      <section className="py-16 bg-surface-muted">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-extrabold text-text-primary font-display mb-8">Media Coverage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mediaCoverage.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">{item.outlet}</span>
                <h3 className="font-bold text-text-primary font-display mt-2 mb-2 text-sm leading-snug">{item.title}</h3>
                <span className="text-xs text-text-muted">{item.date}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Kit & Contact */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl border border-border/60 p-8 shadow-card"
            >
              <Download className="w-10 h-10 text-primary-600 mb-4" />
              <h3 className="text-xl font-bold text-text-primary font-display mb-2">Media Kit</h3>
              <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                Download our brand assets including logos, product images, and company information for press use.
              </p>
              <button className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary">
                <Download size={14} /> Download Kit
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl border border-border/60 p-8 shadow-card"
            >
              <Mail className="w-10 h-10 text-accent-600 mb-4" />
              <h3 className="text-xl font-bold text-text-primary font-display mb-2">Press Inquiries</h3>
              <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                For press and media inquiries, please reach out to our communications team.
              </p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-surface-dark text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary-900 transition-all">
                Contact Us <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
