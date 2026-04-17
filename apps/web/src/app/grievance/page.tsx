'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Scale, ArrowLeft, Mail, Phone, MapPin, Clock, FileText,
  ShieldAlert, UserCheck, ListChecks, BadgeCheck,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const officerDetails = [
  { icon: UserCheck, label: 'Grievance Officer', value: 'Mr. Aman Kumar' },
  { icon: Mail, label: 'Email', value: 'grievance@xelnova.in', href: 'mailto:grievance@xelnova.in' },
  { icon: Phone, label: 'Phone', value: '+91 9259131155', href: 'tel:+919259131155' },
  { icon: Clock, label: 'Working Hours', value: 'Mon\u2013Sat, 10:00 AM \u2013 6:00 PM IST' },
  { icon: MapPin, label: 'Postal Address', value: 'Xelnova Private Limited, 122/1, Pole No - New Line, Sector No. 28, Bamnoli, Dwarka, New Delhi - 110077, India' },
];

const procedure = [
  { icon: ListChecks, title: '1. Raise a Complaint', content: 'Send a detailed written complaint to grievance@xelnova.in. Please include your full name, registered email/phone, order ID (if applicable), and a clear description of the issue along with supporting documents or screenshots.' },
  { icon: BadgeCheck, title: '2. Acknowledgement', content: 'You will receive an acknowledgement with a unique grievance ticket number within 48 hours of receipt of your complaint.' },
  { icon: ShieldAlert, title: '3. Resolution Timeline', content: 'We make every effort to resolve all grievances within 15 working days from the date of receipt, in accordance with the Consumer Protection (E-Commerce) Rules, 2020 and the Information Technology Rules, 2021.' },
  { icon: FileText, title: '4. Escalation', content: 'If you are not satisfied with the resolution provided, or if the issue is not resolved within 30 days, you may escalate the matter to the National Consumer Helpline at 1915 or file a complaint at https://consumerhelpline.gov.in.' },
];

const accepted = [
  'Order, delivery, payment, refund or return-related disputes',
  'Seller misconduct, counterfeit or misleading product listings',
  'Privacy, data protection or unauthorized account access concerns',
  'Violation of platform Terms of Use or Seller Policies',
  'Reporting of unlawful, offensive or infringing content',
  'Any other grievance under the Consumer Protection Act, 2019',
];

export default function GrievancePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-dark via-primary-900 to-surface-dark py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Scale size={14} /> Legal & Compliance
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Grievance Redressal</h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              In compliance with the Consumer Protection (E-Commerce) Rules, 2020 and the Information Technology Rules, 2021, Xelnova has appointed a dedicated Grievance Officer to address concerns from our customers and sellers.
            </p>
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

          {/* Officer Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-br from-primary-600 to-primary-800 text-white rounded-2xl p-8 mb-10 shadow-card relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold font-display">Grievance Officer</h2>
                  <p className="text-sm text-white/70">As per Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020</p>
                </div>
              </div>

              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mt-6">
                {officerDetails.map((d) => (
                  <div key={d.label} className="flex items-start gap-3">
                    <d.icon className="w-4 h-4 text-primary-200 mt-1 flex-shrink-0" />
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-white/60 mb-0.5">{d.label}</dt>
                      <dd className="text-sm text-white leading-relaxed">
                        {d.href ? (
                          <a href={d.href} className="hover:text-primary-200 transition-colors underline-offset-2 hover:underline break-all">
                            {d.value}
                          </a>
                        ) : (
                          d.value
                        )}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </motion.div>

          {/* What can be reported */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border border-border/60 p-6 md:p-8 shadow-card mb-8"
          >
            <h2 className="text-lg font-bold text-text-primary font-display mb-4">Issues You Can Report</h2>
            <ul className="space-y-2.5">
              {accepted.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Procedure */}
          <h2 className="text-xl font-extrabold text-text-primary font-display mb-4">How to File a Grievance</h2>
          <div className="space-y-4 mb-10">
            {procedure.map((p, i) => (
              <motion.div
                key={p.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                className="bg-white rounded-2xl border border-border/60 p-6 shadow-card"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <p.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary font-display mb-2">{p.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{p.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-primary-50 border border-primary-200 rounded-2xl p-6 md:p-8 text-center"
          >
            <Mail className="w-8 h-8 text-primary-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-text-primary font-display mb-2">Have a Grievance to Report?</h3>
            <p className="text-sm text-text-secondary mb-5 max-w-lg mx-auto">
              Write to our Grievance Officer with all relevant details and supporting documents. We will acknowledge your complaint within 48 hours.
            </p>
            <a
              href="mailto:grievance@xelnova.in"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary"
            >
              <Mail size={16} /> grievance@xelnova.in
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs text-text-muted text-center mt-10"
          >
            Last updated: April 2026 &middot; For general queries please visit our <Link href="/support" className="text-primary-600 hover:underline">Help Centre</Link> or <Link href="/contact" className="text-primary-600 hover:underline">Contact Us</Link>.
          </motion.p>
        </div>
      </section>
    </div>
  );
}
