'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle, Smartphone } from 'lucide-react';
import { authApi } from '@xelnova/api';

export default function ForgotPasswordPage() {
  const [method, setMethod] = useState<'email' | 'phone'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOtp = async () => {
    if (method === 'phone' && phone.length !== 10) return;
    if (method === 'email' && !email) return;
    setLoading(true);
    setError('');
    try {
      if (method === 'phone') {
        await authApi.sendOtp(`+91${phone}`);
        setOtpSent(true);
        setSuccess(`OTP sent to +91 ${phone}`);
      } else {
        await authApi.forgotPassword(email);
        setSuccess('If this email is registered, you will receive a password reset link shortly.');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`fp-otp-${index + 1}`);
      next?.focus();
    }
    // Auto-submit when all 6 digits are entered
    const complete = newOtp.join('');
    if (complete.length === 6 && newOtp.every((d) => d !== '')) {
      setTimeout(() => {
        // Auto-submit logic would go here
        // For now, just focus to indicate readiness
      }, 150);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`fp-otp-${index - 1}`);
      prev?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h1>
          <p className="text-gray-500 mb-8">
            {otpSent
              ? 'Enter the OTP sent to your phone to verify your identity.'
              : 'Verify your identity via phone OTP to reset your password.'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && !error && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          {!otpSent ? (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-4">
                <button
                  onClick={() => setMethod('phone')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    method === 'phone' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Smartphone size={16} />
                  Phone
                </button>
                <button
                  onClick={() => setMethod('email')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    method === 'email' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Mail size={16} />
                  Email
                </button>
              </div>

              {method === 'phone' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-4 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium border border-gray-200">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit number"
                      className="flex-1 px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleSendOtp}
                disabled={loading || (method === 'phone' ? phone.length !== 10 : !email)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 py-3.5 text-sm font-semibold text-white hover:from-primary-600 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/25"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {method === 'phone' ? 'Send OTP' : 'Send Reset Link'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-4">Enter OTP sent to +91 {phone}</p>
                <div className="flex gap-3 justify-center">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`fp-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-semibold rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              <p className="text-center text-sm text-gray-500">
                Password reset via OTP is coming soon. For now, please use Google Sign-In or create a new account.
              </p>

              <div className="flex items-center justify-center gap-4 text-sm">
                <button onClick={() => { setOtpSent(false); setOtp(['', '', '', '', '', '']); }} className="text-primary-600 hover:text-primary-700 font-medium">
                  Change number
                </button>
                <span className="text-gray-300">|</span>
                <button onClick={handleSendOtp} disabled={loading} className="text-gray-600 hover:text-gray-900 disabled:opacity-50">
                  Resend OTP
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
