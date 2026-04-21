'use client';

import Link from 'next/link';
import { Smartphone, Star, Shield, Zap, Gift, ArrowLeft, Bell, ShoppingBag, Truck } from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-700 mb-6 shadow-lg shadow-primary-500/25">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get the Xelnova App
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Shop smarter with exclusive app-only deals, real-time order tracking, and a seamless shopping experience right at your fingertips.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-50 text-primary-700 font-medium mb-6">
              <Bell size={18} />
              Coming Soon
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              The Xelnova app is under development
            </h2>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              We&apos;re building something amazing. Be the first to know when the app launches — available soon on Android and iOS.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                disabled
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gray-900 text-white opacity-60 cursor-not-allowed"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.41-1.09-.5-2.08-.51-3.23 0-1.44.62-2.2.44-3.06-.41C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.3-3.74 4.25Z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] opacity-80">Download on the</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
              </button>
              <button
                disabled
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gray-900 text-white opacity-60 cursor-not-allowed"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M3.61 1.814L13.793 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.61-.92zm10.893 9.476l2.56-2.56 3.48 2.015c.67.39.67 1.12 0 1.51l-3.48 2.015-2.56-2.56-.52-.21.52-.21zm-1.41 1.42L3.5 22.303l9.993-5.79-1-1.804zm0-2.82L14.093 8.087 4.1 2.297l-.6-.35 9.993 10.593z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] opacity-80">Get it on</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Gift, title: 'App-Only Deals', desc: 'Get exclusive discounts and flash deals only available on the app' },
            { icon: Truck, title: 'Live Tracking', desc: 'Track your orders in real-time with push notifications' },
            { icon: ShoppingBag, title: 'Faster Checkout', desc: 'Save addresses and payment methods for one-tap checkout' },
            { icon: Star, title: 'Early Access', desc: 'Be the first to shop new arrivals and limited collections' },
            { icon: Shield, title: 'Secure Payments', desc: 'Multiple payment options with bank-grade security' },
            { icon: Zap, title: 'Instant Support', desc: 'Get help instantly through in-app chat support' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <feature.icon className="w-8 h-8 text-primary-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Meanwhile, enjoy the full Xelnova experience on our website.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl bg-primary-50 text-primary-700 font-medium hover:bg-primary-100 transition-colors"
          >
            <ShoppingBag size={16} />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
