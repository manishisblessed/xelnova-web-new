'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowUp, Mail, Phone, MapPin, Send, Facebook, Youtube, Instagram, Smartphone, ShieldCheck } from 'lucide-react';

const footerSections = [
  {
    title: 'Shop',
    links: [
      { name: 'Electronics', href: '/products?category=electronics' },
      { name: 'Fashion', href: '/products?category=fashion' },
      { name: 'Home & Kitchen', href: '/products?category=home-kitchen' },
      { name: 'Beauty', href: '/products?category=beauty' },
      { name: 'Sports', href: '/products?category=sports' },
      { name: 'Books', href: '/products?category=books' },
    ],
  },
  {
    title: 'Sell on Xelnova',
    links: [
      { name: 'Start Selling', href: '/seller' },
      { name: 'Seller Registration', href: '/seller/register' },
      { name: 'Seller Dashboard', href: '/seller/dashboard' },
      { name: 'Seller Policies', href: '/seller/policies' },
      { name: 'Fulfillment', href: '/seller/fulfillment' },
    ],
  },
  {
    title: 'Help & Support',
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
    title: 'Company',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'Blog', href: '/blog' },
    ],
  },
];

const socialLinks = [
  { icon: Facebook, href: 'https://www.facebook.com/people/Xelnova-India/pfbid02dQmA3L3AMABgPWSJUmWb39d9eCnWj37QyCt3r2c3Yup6iub2J66UX99A6pPnyVFRl/', label: 'Facebook' },
  { icon: Youtube, href: 'https://www.youtube.com/@XelnovaIndia', label: 'YouTube' },
  { icon: Instagram, href: 'https://www.instagram.com/xelnova.in', label: 'Instagram' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

export function Footer() {
  return (
    <footer className="bg-surface-dark text-white/80">
      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex w-full items-center justify-center gap-2 bg-primary-700 py-3 text-sm text-white/90 hover:bg-primary-600 transition-colors"
      >
        <ArrowUp size={14} />
        Back to top
      </button>

      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-[1440px] px-6 py-10 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 font-display">Stay in the loop</h3>
              <p className="text-sm text-white/40">Subscribe for exclusive offers, new arrivals & insider-only discounts.</p>
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-80 bg-white/[0.07] border border-white/10 rounded-xl py-3 pl-4 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
              />
              <button className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/20 active:scale-[0.98]">
                <Send className="w-4 h-4" />
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="mx-auto max-w-[1440px] px-6 py-14 lg:px-8"
      >
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-6">
          {/* Brand Column */}
          <motion.div variants={itemVariants} className="col-span-2 mb-4 lg:mb-0">
            <Link href="/" className="inline-block mb-5">
              <Image src="/xelnova-logo.png" alt="Xelnova" width={140} height={40} className="h-9 w-auto brightness-0 invert" />
            </Link>
            <p className="text-sm text-white/40 leading-relaxed mb-5">
              India&apos;s premium marketplace for quality products. Discover authentic brands, unbeatable deals, and fast delivery.
            </p>
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Mail size={13} className="text-primary-400" />
                support@xelnova.in
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Phone size={13} className="text-primary-400" />
                1800-123-XELNOVA
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <MapPin size={13} className="text-primary-400" />
                Mumbai, India
              </div>
            </div>

            {/* App Download Mini */}
            <div className="flex items-center gap-3 mb-5 p-3 bg-white/[0.04] rounded-xl border border-white/[0.06]">
              <div className="w-9 h-9 rounded-lg bg-primary-600/30 flex items-center justify-center flex-shrink-0">
                <Smartphone size={16} className="text-primary-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/70">Download the App</p>
                <p className="text-[10px] text-white/30">Get ₹200 off your first order</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-white/30 hover:bg-primary-600 hover:text-white transition-all duration-200"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Link Sections */}
          {footerSections.map((section) => (
            <motion.div key={section.title} variants={itemVariants}>
              <h3 className="mb-4 text-sm font-semibold text-white font-display">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-white/40 hover:text-primary-400 transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bottom Bar */}
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1440px] px-6 py-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/25">
              <Link href="/terms" className="hover:text-primary-400 transition-colors">Terms of Use</Link>
              <Link href="/privacy" className="hover:text-primary-400 transition-colors">Privacy Policy</Link>
              <Link href="/returns" className="hover:text-primary-400 transition-colors">Return Policy</Link>
              <Link href="/security" className="hover:text-primary-400 transition-colors">Security</Link>
              <Link href="/sitemap" className="hover:text-primary-400 transition-colors">Sitemap</Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-white/20 mr-2">
                <ShieldCheck size={12} className="text-primary-400" />
                Safe & Secure
              </div>
              {['Visa', 'Mastercard', 'UPI', 'Rupay', 'Net Banking', 'Wallets'].map((method) => (
                <span key={method} className="text-[10px] text-white/20 bg-white/[0.04] px-2 py-1 rounded font-medium">
                  {method}
                </span>
              ))}
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-[11px] text-white/20">
              &copy; {new Date().getFullYear()} Xelnova Marketplace Pvt. Ltd. All rights reserved. CIN: U74999MH2024PTC000000
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
