'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  MapPin, Phone, Mail, Clock, Send, MessageCircle,
  Headphones, ArrowRight, CheckCircle2, Loader2,
} from 'lucide-react';
import { contactApi } from '@xelnova/api';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const contactInfo = [
  { icon: MapPin, title: 'Visit Us', lines: ['Xelnova Private Limited', '122/1, Pole No - New Line, Sector No. 28', 'Bamnoli, Dwarka, New Delhi - 110077'], color: 'bg-info-50 text-info-600' },
  { icon: Phone, title: 'Call Us', lines: ['+91 9259131155', 'Mon–Sat, 9 AM – 6 PM IST'], color: 'bg-primary-50 text-primary-600' },
  { icon: Mail, title: 'Email Us', lines: ['support@xelnova.in', 'We reply within 24 hours'], color: 'bg-accent-50 text-accent-600' },
  { icon: Clock, title: 'Working Hours', lines: ['Monday – Saturday', '9:00 AM – 6:00 PM IST'], color: 'bg-success-50 text-success-600' },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleChange = (key: 'name' | 'email' | 'subject' | 'message') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await contactApi.sendContactMessage(form);
      setSubmitted(true);
      toast.success('Message sent! We\u2019ll respond within 24 hours.');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 right-1/3 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <MessageCircle size={14} /> Get in Touch
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white font-display mb-4">Contact Us</h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto">
              Have questions or need help? Our team is here to assist you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 -mt-12">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactInfo.map((item, i) => (
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
                <h3 className="font-bold text-text-primary font-display mb-2">{item.title}</h3>
                {item.lines.map((line) => (
                  <p key={line} className="text-sm text-text-secondary">{line}</p>
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form + Support */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-3 bg-white rounded-2xl border border-border/60 p-8 shadow-card"
            >
              <h2 className="text-2xl font-extrabold text-text-primary font-display mb-2">Send us a Message</h2>
              <p className="text-sm text-text-muted mb-8">Fill out the form below and we&apos;ll get back to you within 24 hours.</p>

              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-50 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-success-600" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary font-display mb-2">Message Sent!</h3>
                  <p className="text-text-muted">We&apos;ll get back to you within 24 hours.</p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-sm font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Your Name</label>
                      <input type="text" required value={form.name} onChange={handleChange('name')} placeholder="John Doe" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Email Address</label>
                      <input type="email" required value={form.email} onChange={handleChange('email')} placeholder="john@example.com" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Subject</label>
                    <input type="text" required value={form.subject} onChange={handleChange('subject')} placeholder="How can we help?" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Message</label>
                    <textarea required rows={5} value={form.message} onChange={handleChange('message')} placeholder="Tell us more about your inquiry..." className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all resize-none" />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {submitting ? 'Sending\u2026' : 'Send Message'}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Support Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-2 space-y-6"
            >
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-display mb-2">24/7 Customer Support</h3>
                  <p className="text-white/60 text-sm mb-6 leading-relaxed">Need immediate help? Our support team is available around the clock.</p>
                  <a href="tel:+919259131155" className="inline-flex items-center gap-2 bg-white text-primary-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-all">
                    Call Now <ArrowRight size={14} />
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-card">
                <h3 className="font-bold text-text-primary font-display mb-4">Quick Links</h3>
                <div className="space-y-3">
                  {[
                    { label: 'FAQ', href: '/faq' },
                    { label: 'Help Centre', href: '/support' },
                    { label: 'Track Your Order', href: '/track-order' },
                    { label: 'Returns & Refunds', href: '/returns' },
                  ].map((link) => (
                    <a key={link.label} href={link.href} className="flex items-center justify-between text-sm text-text-secondary hover:text-primary-600 transition-colors py-2 border-b border-border-light last:border-0">
                      {link.label}
                      <ArrowRight size={14} className="text-text-muted" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
