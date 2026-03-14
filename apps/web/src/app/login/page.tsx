"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Smartphone } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"email" | "phone">("phone");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
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
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-4">
              <Image src="/xelnova-logo.png" alt="Xelnova" width={160} height={44} className="h-10 w-auto mx-auto" />
            </Link>
            <h1 className="text-2xl font-bold text-white font-display">Welcome back</h1>
            <p className="mt-1 text-sm text-surface-100">Sign in to your Xelnova account</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-surface-700 p-1 mb-6">
            <button onClick={() => { setMode("phone"); setOtpSent(false); }} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${mode === "phone" ? "bg-gold-400 text-surface-950" : "text-surface-100 hover:text-white"}`}>
              <Smartphone size={16} /> Phone
            </button>
            <button onClick={() => { setMode("email"); setOtpSent(false); }} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${mode === "email" ? "bg-gold-400 text-surface-950" : "text-surface-100 hover:text-white"}`}>
              <Mail size={16} /> Email
            </button>
          </div>

          {mode === "phone" ? (
            !otpSent ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-50 mb-1.5">Phone Number</label>
                  <div className="flex items-center rounded-xl border border-surface-300 bg-surface-700 overflow-hidden focus-within:border-gold-400 transition-colors">
                    <span className="px-3 text-sm text-surface-100 border-r border-surface-300">+91</span>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" maxLength={10} className="flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-surface-200" />
                  </div>
                </div>
                <button onClick={() => setOtpSent(true)} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-400 py-3.5 text-sm font-bold text-surface-950 hover:bg-gold-300 hover:shadow-glow transition-all">
                  Send OTP <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-50 mb-1.5">Enter OTP sent to +91 {phone}</label>
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, i) => (
                      <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} className="h-12 w-12 rounded-xl border border-surface-300 bg-surface-700 text-center text-lg font-bold text-white outline-none focus:border-gold-400 transition-colors" />
                    ))}
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-400 py-3.5 text-sm font-bold text-surface-950 hover:bg-gold-300 hover:shadow-glow transition-all">
                  Verify & Sign In <ArrowRight size={16} />
                </button>
                <div className="text-center">
                  <button onClick={() => setOtpSent(false)} className="text-sm text-gold-400 hover:text-gold-300">Change number</button>
                  <span className="mx-2 text-surface-300">|</span>
                  <button className="text-sm text-surface-100 hover:text-white">Resend OTP</button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-50 mb-1.5">Email Address</label>
                <div className="flex items-center rounded-xl border border-surface-300 bg-surface-700 overflow-hidden focus-within:border-gold-400 transition-colors">
                  <span className="px-3 text-surface-200"><Mail size={16} /></span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-surface-200" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-50 mb-1.5">Password</label>
                <div className="flex items-center rounded-xl border border-surface-300 bg-surface-700 overflow-hidden focus-within:border-gold-400 transition-colors">
                  <span className="px-3 text-surface-200"><Lock size={16} /></span>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-surface-200" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="px-3 text-surface-200 hover:text-white">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-surface-100"><input type="checkbox" className="accent-gold-400 rounded" />Remember me</label>
                <Link href="/forgot-password" className="text-sm text-gold-400 hover:text-gold-300">Forgot password?</Link>
              </div>
              <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-400 py-3.5 text-sm font-bold text-surface-950 hover:bg-gold-300 hover:shadow-glow transition-all">
                Sign In <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-300/30"></div></div><div className="relative flex justify-center text-xs"><span className="bg-surface-800 px-3 text-surface-200">or</span></div></div>

          <p className="text-center text-sm text-surface-100">
            New to Xelnova?{" "}
            <Link href="/register" className="font-semibold text-gold-400 hover:text-gold-300">Create an account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
