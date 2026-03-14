"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "" });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-surface-300/50 bg-surface-800 p-8 shadow-card"
        >
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-4">
              <Image src="/xelnova-logo.png" alt="Xelnova" width={160} height={44} className="h-10 w-auto mx-auto" />
            </Link>
            <h1 className="text-2xl font-bold text-white font-display">Create your account</h1>
            <p className="mt-1 text-sm text-surface-100">Join Xelnova and start shopping</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-50 mb-1.5">Full Name</label>
              <div className="flex items-center rounded-xl border border-surface-300 bg-surface-700 overflow-hidden focus-within:border-gold-400 transition-colors">
                <span className="px-3 text-surface-200"><User size={16} /></span>
                <input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Enter your full name" className="flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-surface-200" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-50 mb-1.5">Phone Number</label>
              <div className="flex items-center rounded-xl border border-surface-300 bg-surface-700 overflow-hidden focus-within:border-gold-400 transition-colors">
                <span className="px-3 text-sm text-surface-100 border-r border-surface-300">+91</span>
                <input type="tel" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="Enter phone number" maxLength={10} className="flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-surface-200" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-50 mb-1.5">Email Address</label>
              <div className="flex items-center rounded-xl border border-surface-300 bg-surface-700 overflow-hidden focus-within:border-gold-400 transition-colors">
                <span className="px-3 text-surface-200"><Mail size={16} /></span>
                <input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="you@example.com" className="flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-surface-200" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-50 mb-1.5">Password</label>
              <div className="flex items-center rounded-xl border border-surface-300 bg-surface-700 overflow-hidden focus-within:border-gold-400 transition-colors">
                <span className="px-3 text-surface-200"><Lock size={16} /></span>
                <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => handleChange("password", e.target.value)} placeholder="Create a password" className="flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-surface-200" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="px-3 text-surface-200 hover:text-white">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              <p className="mt-1 text-xs text-surface-200">Must be at least 8 characters</p>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input type="checkbox" className="mt-1 accent-gold-400 rounded" />
              <p className="text-xs text-surface-100">
                I agree to Xelnova&apos;s{" "}
                <Link href="/terms" className="text-gold-400 hover:text-gold-300">Terms of Use</Link> and{" "}
                <Link href="/privacy" className="text-gold-400 hover:text-gold-300">Privacy Policy</Link>
              </p>
            </div>

            <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-400 py-3.5 text-sm font-bold text-surface-950 hover:bg-gold-300 hover:shadow-glow transition-all">
              Create Account <ArrowRight size={16} />
            </button>
          </div>

          <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-300/30"></div></div><div className="relative flex justify-center text-xs"><span className="bg-surface-800 px-3 text-surface-200">or</span></div></div>

          <p className="text-center text-sm text-surface-100">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-gold-400 hover:text-gold-300">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
