'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Users, Package, Store, Truck, ShieldCheck, Heart, Globe, Award,
  ArrowRight, Zap, Target, Sparkles,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const stats = [
  { icon: Package, value: '50,000+', label: 'Products Listed' },
  { icon: Store, value: '500+', label: 'Trusted Sellers' },
  { icon: Users, value: '10M+', label: 'Happy Customers' },
  { icon: Globe, value: '500+', label: 'Cities Served' },
];

const values = [
  { icon: Heart, title: 'Customer First', desc: 'Every decision we make starts with what\'s best for our customers.', color: 'bg-danger-50 text-danger-500' },
  { icon: ShieldCheck, title: 'Trust & Safety', desc: 'We ensure every product meets our high-quality standards with verified sellers.', color: 'bg-primary-50 text-primary-600' },
  { icon: Zap, title: 'Innovation', desc: 'We constantly push boundaries to create the best shopping experience possible.', color: 'bg-accent-50 text-accent-600' },
  { icon: Target, title: 'Accessibility', desc: 'Making quality products affordable and accessible to everyone across India.', color: 'bg-info-50 text-info-600' },
];

const timeline = [
  { year: '2024', title: 'Founded', desc: 'Xelnova was born with a vision to democratize e-commerce for every Indian.' },
  { year: '2025', title: 'Rapid Growth', desc: 'Expanded to 500+ cities, onboarded 500+ sellers and reached 10M+ customers.' },
  { year: '2026', title: 'Next Chapter', desc: 'Launching new categories, AI-powered recommendations, and same-day delivery.' },
];

const whyUs = [
  { icon: Package, title: 'Wide Selection', desc: 'A vast range of products across multiple categories from trusted brands.' },
  { icon: ShieldCheck, title: 'Quality Assurance', desc: 'Every product meets high-quality standards before being listed.' },
  { icon: Award, title: 'Secure Payments', desc: 'Advanced encryption technology keeps your payments safe and secure.' },
  { icon: Truck, title: 'Fast Delivery', desc: 'Leading logistics partners ensure timely delivery of your orders.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-24 md:py-32">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Sparkles size={14} /> Our Story
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white font-display mb-6 leading-tight">
              About <span className="text-accent-300">Xelnova</span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              India&apos;s premium marketplace for quality products. We&apos;re dedicated to giving you the very best, with a focus on dependability, customer service, and uniqueness.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 -mt-12">
        <div className="mx-auto max-w-[1440px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl border border-border/60 shadow-elevated p-8 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, i) => (
              <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary-50 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-3xl font-extrabold text-text-primary font-display">{stat.value}</div>
                <div className="text-sm text-text-muted mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Our Story</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary font-display mb-6 leading-tight">
                Building India&apos;s Most Trusted Marketplace
              </h2>
              <div className="space-y-4 text-text-secondary leading-relaxed">
                <p>
                  Welcome to Xelnova, your number one source for all things electronics, fashion, and home essentials. We&apos;re dedicated to giving you the very best of products, with a focus on dependability, customer service, and uniqueness.
                </p>
                <p>
                  Founded in 2024, Xelnova has come a long way from its beginnings. Our passion for providing high-quality products at affordable prices drove us to turn hard work and inspiration into a booming online marketplace. We now serve customers all over India, and are thrilled to be a part of the eco-friendly, fair trade wing of the e-commerce industry.
                </p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-primary-100 to-accent-50">
                <Image src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop" alt="Xelnova team" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/40 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-surface-muted">
        <div className="mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Our Mission</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary font-display mb-6 max-w-3xl mx-auto leading-tight">
              Democratizing E-Commerce for Everyone
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed text-lg">
              We believe that everyone deserves access to high-quality products at affordable prices. We empower sellers to reach a wider audience and enable customers to discover unique products from across the country.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Our Values</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary font-display">What We Stand For</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text-primary font-display mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-surface-muted">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Our Journey</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary font-display">Milestones</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-0">
            {timeline.map((item, i) => (
              <motion.div
                key={item.year}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex gap-6 relative"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm font-display z-10">
                    {item.year.slice(2)}
                  </div>
                  {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-primary-200 my-2" />}
                </div>
                <div className="pb-10">
                  <span className="text-xs font-bold text-primary-600">{item.year}</span>
                  <h3 className="text-lg font-bold text-text-primary font-display mt-1">{item.title}</h3>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Why Xelnova</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary font-display">Why Choose Us?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {whyUs.map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex items-start gap-4 bg-white rounded-2xl border border-border/60 p-6 shadow-card"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary font-display mb-1">{item.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 rounded-3xl p-10 md:p-14 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.06]">
              <div className="absolute top-0 right-1/4 w-80 h-80 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white font-display mb-4">Ready to Start Shopping?</h2>
              <p className="text-white/50 mb-8 max-w-lg mx-auto">Discover thousands of products from verified sellers with fast delivery across India.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/products" className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-50 transition-all shadow-lg">
                  Browse Products <ArrowRight size={16} />
                </Link>
                <Link href="/seller" className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 px-8 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all">
                  Become a Seller
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
