'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Map, ShoppingBag, Store, HelpCircle, Building2, FileText,
  ChevronRight,
} from 'lucide-react';

const sitemapSections = [
  {
    icon: ShoppingBag,
    title: 'Shop',
    color: 'bg-primary-50 text-primary-600',
    links: [
      { name: 'All Products', href: '/products' },
      { name: 'Electronics', href: '/products?category=electronics' },
      { name: 'Fashion', href: '/products?category=fashion' },
      { name: 'Home & Kitchen', href: '/products?category=home-kitchen' },
      { name: 'Beauty', href: '/products?category=beauty' },
      { name: 'Sports', href: '/products?category=sports' },
      { name: 'Books', href: '/products?category=books' },
    ],
  },
  {
    icon: Store,
    title: 'Sell on Xelnova',
    color: 'bg-accent-50 text-accent-600',
    links: [
      { name: 'Start Selling', href: '/seller' },
      { name: 'Seller Registration', href: '/seller/register' },
      { name: 'Seller Dashboard', href: '/seller/dashboard' },
      { name: 'Seller Policies', href: '/seller/policies' },
      { name: 'Fulfillment', href: '/seller/fulfillment' },
    ],
  },
  {
    icon: HelpCircle,
    title: 'Help & Support',
    color: 'bg-info-50 text-info-600',
    links: [
      { name: 'Your Account', href: '/account/profile' },
      { name: 'Track Orders', href: '/track-order' },
      { name: 'Returns & Refunds', href: '/returns' },
      { name: 'Shipping Info', href: '/shipping' },
      { name: 'Help Centre', href: '/support' },
      { name: 'FAQ', href: '/faq' },
    ],
  },
  {
    icon: Building2,
    title: 'Company',
    color: 'bg-success-50 text-success-600',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'Blog', href: '/blog' },
    ],
  },
  {
    icon: FileText,
    title: 'Legal',
    color: 'bg-danger-50 text-danger-600',
    links: [
      { name: 'Terms of Use', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Return Policy', href: '/returns' },
      { name: 'Security', href: '/security' },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-primary-900 to-surface-dark py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Map size={14} /> Navigation
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Sitemap</h1>
            <p className="text-lg text-white/80">Find everything on Xelnova in one place.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sitemapSections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-white rounded-2xl border border-border/60 shadow-card overflow-hidden"
              >
                <div className="p-6 pb-4 flex items-center gap-3 border-b border-border/60">
                  <div className={`w-10 h-10 rounded-xl ${section.color} flex items-center justify-center`}>
                    <section.icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-text-primary font-display">{section.title}</h2>
                </div>
                <ul className="p-4 space-y-0.5">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg text-sm text-text-secondary hover:bg-primary-50 hover:text-primary-600 transition-all group"
                      >
                        {link.name}
                        <ChevronRight size={14} className="text-text-muted group-hover:text-primary-500 transition-colors" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
