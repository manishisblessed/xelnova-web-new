'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Store, FileText, CreditCard, ArrowRight, ArrowLeft,
  CheckCircle2, User, Building2, Shield, Eye, EyeOff,
} from 'lucide-react';

const steps = [
  { id: 1, icon: User, label: 'Account' },
  { id: 2, icon: Building2, label: 'Business' },
  { id: 3, icon: FileText, label: 'Tax Info' },
];

export default function SellerRegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-surface-raised">
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 py-12 md:py-16">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute top-0 left-1/3 w-80 h-80 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-4">
              <Store size={14} /> Seller Registration
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display mb-2">Create Your Seller Account</h1>
            <p className="text-sm text-white/50">Join 50,000+ sellers and start growing your business</p>
          </motion.div>
        </div>
      </section>

      {/* Stepper + Form */}
      <section className="py-12">
        <div className="mx-auto max-w-2xl px-6">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-4 mb-10">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentStep >= step.id
                      ? 'bg-primary-600 text-white shadow-primary'
                      : 'bg-white text-text-muted border border-border/60'
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle2 size={16} /> : <step.icon size={16} />}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {i < steps.length - 1 && <div className={`w-8 h-0.5 ${currentStep > step.id ? 'bg-primary-400' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          {/* Form */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl border border-border/60 p-8 shadow-card"
          >
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-text-primary font-display mb-1">Account Details</h2>
                  <p className="text-sm text-text-muted">Create your login credentials</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">First Name</label>
                    <input type="text" placeholder="John" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Last Name</label>
                    <input type="text" placeholder="Doe" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Email Address</label>
                  <input type="email" placeholder="john@example.com" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Phone Number</label>
                  <input type="tel" placeholder="+91 98765 43210" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 pr-11 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-text-primary font-display mb-1">Business Details</h2>
                  <p className="text-sm text-text-muted">Tell us about your business</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Business / Store Name</label>
                  <input type="text" placeholder="Your Store Name" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Business Type</label>
                  <select className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all">
                    <option value="">Select business type</option>
                    <option>Individual / Sole Proprietor</option>
                    <option>Partnership</option>
                    <option>Private Limited Company</option>
                    <option>LLP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Business Address</label>
                  <textarea rows={3} placeholder="Full business address" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">City</label>
                    <input type="text" placeholder="City" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">PIN Code</label>
                    <input type="text" placeholder="560001" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-text-primary font-display mb-1">Tax Information</h2>
                  <p className="text-sm text-text-muted">Required for compliance and payouts</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">GST Number (optional)</label>
                  <input type="text" placeholder="22AAAAA0000A1Z5" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">PAN Number</label>
                  <input type="text" placeholder="ABCDE1234F" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Bank Account Number</label>
                  <input type="text" placeholder="Account number" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">IFSC Code</label>
                  <input type="text" placeholder="SBIN0001234" className="w-full bg-surface-raised border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all" />
                </div>
                <div className="flex items-start gap-3 mt-4 bg-primary-50 border border-primary-200 rounded-xl p-4">
                  <Shield size={18} className="text-primary-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-primary-800 leading-relaxed">
                    By registering, you agree to Xelnova&apos;s <Link href="/seller/policies" className="font-semibold underline">Seller Terms & Conditions</Link> and <Link href="/privacy" className="font-semibold underline">Privacy Policy</Link>.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/60">
              {currentStep > 1 ? (
                <button onClick={prevStep} className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
                  <ArrowLeft size={16} /> Previous
                </button>
              ) : (
                <Link href="/seller" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
                  <ArrowLeft size={16} /> Back
                </Link>
              )}
              {currentStep < 3 ? (
                <button onClick={nextStep} className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary">
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary">
                  Create Account <ArrowRight size={16} />
                </button>
              )}
            </div>
          </motion.div>

          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account?{' '}
            <Link href="/seller/dashboard" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
