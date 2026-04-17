'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Briefcase, MapPin, Clock, ArrowRight, Heart, Zap,
  Users, Globe, Sparkles, Coffee,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const perks = [
  { icon: Heart, title: 'Health & Wellness', desc: 'Comprehensive health insurance for you and your family, plus mental wellness programs.' },
  { icon: Coffee, title: 'Flexible Work', desc: 'Hybrid work policy with flexible hours. Work from where you\'re most productive.' },
  { icon: Zap, title: 'Learning Budget', desc: '₹50,000 annual learning allowance for courses, conferences, and certifications.' },
  { icon: Users, title: 'Team Events', desc: 'Regular team outings, hackathons, and annual offsite retreats to build bonds.' },
  { icon: Globe, title: 'Global Exposure', desc: 'Work with diverse teams and cutting-edge technology that serves millions.' },
  { icon: Sparkles, title: 'ESOPs', desc: 'Stock options for eligible employees. Grow with us as we scale.' },
];

const openings = [
  { title: 'Senior Frontend Engineer', dept: 'Engineering', location: 'Bengaluru / Remote', type: 'Full-time' },
  { title: 'Backend Engineer (Node.js)', dept: 'Engineering', location: 'Bengaluru', type: 'Full-time' },
  { title: 'Product Designer', dept: 'Design', location: 'Bengaluru / Remote', type: 'Full-time' },
  { title: 'Data Analyst', dept: 'Analytics', location: 'Mumbai', type: 'Full-time' },
  { title: 'Customer Success Manager', dept: 'Operations', location: 'Mumbai', type: 'Full-time' },
  { title: 'Content Marketing Specialist', dept: 'Marketing', location: 'Remote', type: 'Full-time' },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-24 md:py-32">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Briefcase size={14} /> Join Our Team
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white font-display mb-6 leading-tight">
              Build the Future of<br /><span className="text-accent-300">E-Commerce</span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
              Join a team of passionate builders creating India&apos;s most trusted marketplace. We&apos;re hiring across engineering, design, product, and operations.
            </p>
            <a href="#openings" className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-50 transition-all shadow-lg">
              View Open Positions <ArrowRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Why Xelnova */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Why Xelnova</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary font-display">Perks & Benefits</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {perks.map((perk, i) => (
              <motion.div
                key={perk.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                  <perk.icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-bold text-text-primary font-display mb-2">{perk.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{perk.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="openings" className="py-16 bg-surface-muted scroll-mt-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-600 mb-3 block">Open Roles</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary font-display">Current Openings</h2>
          </div>
          <div className="space-y-3">
            {openings.map((job, i) => (
              <motion.div
                key={job.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <Link
                  href="/contact"
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl border border-border/60 p-5 shadow-card hover:shadow-card-hover hover:border-primary-200 transition-all group"
                >
                  <div>
                    <h3 className="font-bold text-text-primary group-hover:text-primary-600 transition-colors">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="text-xs text-text-muted">{job.dept}</span>
                      <span className="flex items-center gap-1 text-xs text-text-muted"><MapPin size={11} /> {job.location}</span>
                      <span className="flex items-center gap-1 text-xs text-text-muted"><Clock size={11} /> {job.type}</span>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-text-muted group-hover:text-primary-600 transition-colors mt-3 sm:mt-0" />
                </Link>
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
              <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-accent-400 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white font-display mb-4">Don&apos;t See a Match?</h2>
              <p className="text-white/80 mb-8 max-w-md mx-auto">Send us your resume and we&apos;ll keep you in mind for future openings.</p>
              <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-50 transition-all shadow-lg">
                Get in Touch <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
