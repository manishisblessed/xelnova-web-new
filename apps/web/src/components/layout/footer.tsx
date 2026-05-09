'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUp, Mail, Phone, MapPin, Send, Facebook, Youtube, Instagram, Smartphone, ShieldCheck, Loader2 } from 'lucide-react';
import { useCategories } from '@/lib/api';
import { contactApi } from '@xelnova/api';

const fallbackShopLinks = [
  { name: 'Electronics', href: '/products?category=electronics' },
  { name: 'Fashion', href: '/products?category=fashion' },
  { name: 'Home & Kitchen', href: '/products?category=home-kitchen' },
  { name: 'Beauty & Health', href: '/products?category=beauty-health' },
  { name: 'Sports & Outdoors', href: '/products?category=sports-outdoors' },
  { name: 'Books', href: '/products?category=books' },
  { name: 'Toys & Games', href: '/products?category=toys-games' },
  { name: 'All Categories', href: '/products' },
];

const staticSections = [
  {
    title: 'Sell on Xelnova',
    links: [
      { name: 'Start Selling', href: '/seller' },
      { name: 'Seller Registration', href: '/seller/register' },
      { name: 'Seller Dashboard', href: 'https://seller.xelnova.in', external: true },
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
      { name: 'Grievance Redressal', href: '/grievance' },
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

const paymentMethods: { name: string; src: string }[] = [
  { name: 'Visa', src: '/payments/brands/visa.jpeg' },
  { name: 'Mastercard', src: '/payments/brands/master_card.jpeg' },
  { name: 'Diners Club', src: '/payments/brands/dinners_club.jpeg' },
  { name: 'Amazon Pay', src: '/payments/brands/amazon_pay.jpeg' },
  { name: 'Google Pay', src: '/payments/brands/google_pay.jpeg' },
  { name: 'PhonePe', src: '/payments/brands/phone_pe.jpeg' },
  { name: 'Paytm', src: '/payments/brands/paytm.jpeg' },
  { name: 'CRED', src: '/payments/brands/cred.jpeg' },
  { name: 'PayZapp', src: '/payments/brands/payzapp.jpeg' },
  { name: 'Razorpay', src: '/payments/brands/razorpay.jpeg' },
];

export function Footer() {
  const pathname = usePathname();
  const { data: categories } = useCategories();
  const hideBackToTop = pathname === '/login';
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = subscribeEmail.trim();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    const normalized = email.toLowerCase();
    const valid =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) &&
      normalized.length <= 160 &&
      !normalized.includes('..');
    if (!valid) {
      toast.error('Enter a valid email address');
      return;
    }
    setSubscribing(true);
    try {
      await contactApi.subscribeNewsletter(normalized);
      toast.success("You're subscribed", {
        description: 'Confirmations and offers may arrive from info@xelnova.in.',
      });
      setSubscribeEmail('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe. Please try again.';
      toast.error(message);
    } finally {
      setSubscribing(false);
    }
  };

  const categoryLinks = (categories || []).slice(0, 8).map((cat) => ({
    name: cat.name,
    href: `/products?category=${cat.slug}`,
  }));

  const shopSection = {
    title: 'Shop',
    links: categoryLinks.length > 0 ? categoryLinks : fallbackShopLinks,
  };

  const footerSections = [shopSection, ...staticSections];

  return (
    <footer className="bg-surface-dark text-white/80">
      {!hideBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex w-full items-center justify-center gap-2 bg-primary-600 py-3 text-sm text-white/90 hover:bg-primary-500 transition-colors"
        >
          <ArrowUp size={14} />
          Back to top
        </button>
      )}

      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-1 font-display">Stay in the loop</h3>
              <p className="text-sm text-white/70 max-w-md mx-auto md:mx-0">Subscribe for exclusive offers, new arrivals & insider-only discounts.</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch md:w-auto md:max-w-xl">
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={subscribing}
                className="min-h-[44px] w-full flex-1 rounded-xl border border-white/10 bg-white/[0.07] py-3 pl-4 pr-4 text-sm text-white placeholder:text-white/60 transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30 disabled:opacity-60 md:min-w-[240px] md:flex-initial lg:w-80"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {subscribing ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-14 lg:px-8"
      >
        <div className="grid grid-cols-2 gap-8 sm:gap-10 md:grid-cols-4 lg:grid-cols-6">
          {/* Brand Column */}
          <motion.div variants={itemVariants} className="col-span-2 mb-4 lg:mb-0">
            <Link href="/" className="inline-block mb-5">
              <Image src="/xelnova-logo-white.png" alt="Xelnova" width={280} height={80} className="h-10 w-auto" />
            </Link>
            <p className="text-sm text-white/70 leading-relaxed mb-5">
              India&apos;s premium marketplace for quality products. Discover authentic brands, unbeatable deals, and fast delivery.
            </p>
            <div className="space-y-2.5 mb-6">
              <a href="mailto:support@xelnova.in" className="flex items-center gap-2 text-xs text-white/70 hover:text-primary-300 transition-colors">
                <Mail size={13} className="text-primary-400 shrink-0" />
                support@xelnova.in
              </a>
              <a href="tel:+919259131155" className="flex items-center gap-2 text-xs text-white/70 hover:text-primary-300 transition-colors">
                <Phone size={13} className="text-primary-400 shrink-0" />
                +91 9259131155
              </a>
              <div className="flex items-start gap-2 text-xs text-white/70 leading-relaxed">
                <MapPin size={13} className="text-primary-400 shrink-0 mt-0.5" />
                <span>
                  Xelnova Private Limited, 122/1, Pole No - New Line,
                  Sector No. 28, Bamnoli, Dwarka, New Delhi - 110077
                </span>
              </div>
            </div>

            {/* App Download Mini */}
            <div className="flex items-center gap-3 mb-5 p-3 bg-white/[0.04] rounded-xl border border-white/[0.06]">
              <div className="w-9 h-9 rounded-lg bg-primary-600/30 flex items-center justify-center flex-shrink-0">
                <Smartphone size={16} className="text-primary-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/70">Download the App</p>
                <p className="text-[10px] text-white/60">Get ₹200 off your first order</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-white/70 hover:bg-primary-600 hover:text-white transition-all duration-200"
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
                    {(link as any).external ? (
                      <a href={link.href} className="text-sm text-white/70 hover:text-primary-300 transition-colors">
                        {link.name}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-sm text-white/70 hover:text-primary-300 transition-colors">
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bottom Bar */}
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/65">
              <Link href="/terms" className="hover:text-primary-400 transition-colors">Terms of Use</Link>
              <Link href="/privacy" className="hover:text-primary-400 transition-colors">Privacy Policy</Link>
              <Link href="/returns" className="hover:text-primary-400 transition-colors">Return Policy</Link>
              <Link href="/security" className="hover:text-primary-400 transition-colors">Security</Link>
              <Link href="/grievance" className="hover:text-primary-400 transition-colors">Grievance Redressal</Link>
              <Link href="/sitemap" className="hover:text-primary-400 transition-colors">Sitemap</Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-white/60 mr-1">
                <ShieldCheck size={12} className="text-primary-400" />
                Safe & Secure
              </div>
              {paymentMethods.map((method) => (
                <span
                  key={method.name}
                  title={method.name}
                  aria-label={method.name}
                  className="inline-flex h-8 w-12 items-center justify-center overflow-hidden rounded bg-white shadow-sm ring-1 ring-black/5"
                >
                  <Image
                    src={method.src}
                    alt={method.name}
                    width={96}
                    height={64}
                    className="h-full w-full object-contain"
                  />
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-2 border-t border-white/[0.06] pt-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-white/55">Payments powered by</span>
              <span className="inline-flex h-8 w-16 items-center justify-center overflow-hidden rounded bg-white shadow-sm ring-1 ring-black/5">
                <Image
                  src="/payments/brands/axis.jpeg"
                  alt="Axis Bank Payment Gateway"
                  width={128}
                  height={64}
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="inline-flex h-8 w-16 items-center justify-center overflow-hidden rounded bg-white shadow-sm ring-1 ring-black/5">
                <Image
                  src="/payments/brands/razorpay.jpeg"
                  alt="Razorpay"
                  width={128}
                  height={64}
                  className="h-full w-full object-contain"
                />
              </span>
            </div>
          </div>

          <div className="text-center mt-4 space-y-1.5">
            <p className="text-[11px] text-white/60">
              &copy; {new Date().getFullYear()} Xelnova Private Limited. All rights reserved. CIN: U47912DL2025PTC458111
            </p>
            <p className="text-[11px] text-white/50">
              Crafted with{' '}
              <span aria-hidden className="text-primary-400">&hearts;</span>
              <span className="sr-only">love</span>{' '}
              by{' '}
              <a
                href="https://www.shahworks.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold bg-gradient-to-r from-primary-300 via-primary-400 to-primary-500 bg-clip-text text-transparent hover:from-primary-200 hover:to-primary-400 transition-all underline-offset-4 hover:underline"
              >
                Shah Works
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
