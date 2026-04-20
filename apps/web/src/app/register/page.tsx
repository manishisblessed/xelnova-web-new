"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Loader2,
  ShoppingBag,
  Truck,
  Shield,
  Gift,
  Heart,
  Star,
} from "lucide-react";
import { authApi } from "@xelnova/api";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

const benefits = [
  { icon: ShoppingBag, text: "Discover thousands of quality products" },
  { icon: Heart, text: "Save favourites to your wishlist" },
  { icon: Gift, text: "Exclusive member-only discounts" },
  { icon: Star, text: "Earn rewards on every purchase" },
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "" });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit =
    formData.name.trim() &&
    formData.email.trim() &&
    formData.password.length >= 8 &&
    agreed &&
    !loading;

  const handleRegister = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const result = await authApi.register(
        formData.name.trim(),
        formData.email.trim(),
        formData.password,
        formData.phone ? `+91${formData.phone}` : undefined,
      );
      localStorage.setItem("xelnova-auth-provider", "email");
      document.cookie = `xelnova-token=${result.accessToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      document.cookie = `xelnova-refresh-token=${result.refreshToken}; path=/; max-age=${COOKIE_MAX_AGE}`;
      window.location.href = "/";
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Link href="/" className="inline-block mb-12">
              <Image src="/xelnova-logo-white.png" alt="Xelnova" width={280} height={80} className="h-12 w-auto" priority />
            </Link>

            <h1 className="text-4xl xl:text-5xl font-bold text-white font-display leading-tight mb-6">
              Join the <br />
              <span className="text-white/90">Xelnova Family</span>
            </h1>

            <p className="text-lg text-white/80 mb-12 max-w-md">
              Create your free account and get access to exclusive deals, fast delivery, and a world of products.
            </p>

            <div className="space-y-4">
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <b.icon size={20} className="text-white" />
                  </div>
                  <span className="text-white/90 font-medium">{b.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 flex items-center gap-6">
              <div className="flex items-center gap-2 text-white/70">
                <Shield size={18} />
                <span className="text-sm">Secure Payments</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Truck size={18} />
                <span className="text-sm">Fast Delivery</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <Link href="/" className="lg:hidden flex justify-center mb-8">
            <Image src="/xelnova-logo-dark.png" alt="Xelnova" width={280} height={80} className="h-10 w-auto" />
          </Link>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              {/* Desktop inline logo */}
              <Link href="/" className="hidden lg:inline-block mb-4">
                <Image src="/xelnova-logo-dark.png" alt="Xelnova" width={280} height={80} className="h-10 w-auto mx-auto" />
              </Link>
              <h2 className="text-2xl font-bold text-gray-900 font-display">Create your account</h2>
              <p className="text-gray-500 mt-2">Join Xelnova and start shopping</p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && canSubmit && handleRegister()}
                    placeholder="Enter your full name"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 overflow-hidden focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
                  <span className="px-4 py-3.5 text-sm text-gray-600 border-r border-gray-200 bg-gray-100">+91</span>
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter phone number"
                    maxLength={10}
                    className="flex-1 bg-transparent px-4 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && canSubmit && handleRegister()}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && canSubmit && handleRegister()}
                    placeholder="Create a password"
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">Must be at least 8 characters</p>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  id="reg-agree"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                />
                <label htmlFor="reg-agree" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                  I agree to Xelnova&apos;s{" "}
                  <Link href="/terms" className="text-violet-600 hover:text-violet-700 font-medium">Terms of Use</Link> and{" "}
                  <Link href="/privacy" className="text-violet-600 hover:text-violet-700 font-medium">Privacy Policy</Link>
                </label>
              </div>

              {/* Submit */}
              <button
                onClick={handleRegister}
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3.5 text-sm font-semibold text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-500">or</span>
              </div>
            </div>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-violet-600 hover:text-violet-700 font-semibold">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
