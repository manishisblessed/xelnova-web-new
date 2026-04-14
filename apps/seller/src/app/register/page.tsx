'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  FileText,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2,
  Shield,
  Truck,
  TrendingUp,
  Loader2,
  XCircle,
  CheckCircle,
  Upload,
  Package,
  Store,
  AlertCircle,
  Pencil,
  Fingerprint,
  PenTool,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { Button } from '@xelnova/ui';
import { publicApiBase } from '@/lib/public-api-base';
import { apiGetUserProfile, getDashboardToken } from '@/lib/api';

const API_BASE = publicApiBase();
/** Placeholder token for step-1 when email/phone were already verified (session); backend accepts any non-empty string today. */
const SESSION_VERIFIED_TOKEN = 'session-verified';
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (cb: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

const steps = [
  { id: 1, title: 'Account', description: 'Email & Phone Verification', icon: User },
  { id: 2, title: 'Business Verification', description: 'GST, KYC & Store Details', icon: FileText },
  { id: 3, title: 'Final Setup', description: 'Signature, Shipping & Bank', icon: CreditCard },
];

const benefits = [
  { icon: TrendingUp, text: 'Access 50L+ customers' },
  { icon: Truck, text: 'Free logistics support' },
  { icon: Shield, text: 'Secure payments' },
  { icon: Package, text: 'Easy inventory management' },
];

const categories = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'home', label: 'Home & Kitchen' },
  { value: 'beauty', label: 'Beauty & Personal Care' },
  { value: 'sports', label: 'Sports & Fitness' },
  { value: 'books', label: 'Books & Stationery' },
  { value: 'toys', label: 'Toys & Games' },
  { value: 'grocery', label: 'Grocery & Gourmet' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'automotive', label: 'Automotive' },
];

function StepHeader({ step, title, description }: { step: number; title: string; description: string }) {
  const meta = steps.find((s) => s.id === step);
  const Icon = meta?.icon ?? User;
  return (
    <div className="relative mb-6 pb-6 border-b border-gray-100">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/20">
          <Icon size={20} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-600 mb-1">Step {step} of 3</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 font-display tracking-tight leading-tight">{title}</h2>
          <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

interface VerificationState {
  status: 'idle' | 'loading' | 'verified' | 'error';
  data?: any;
  error?: string;
}

interface OtpState {
  sent: boolean;
  verified: boolean;
  loading: boolean;
  error?: string;
  token?: string;
  expiresIn?: number;
}

interface CaptchaState {
  loading: boolean;
  solved: boolean;
  token?: string;
  error?: string;
  mode?: 'recaptcha' | 'math';
  mathPuzzle?: { sessionId: string; instruction: string };
}

interface AadhaarState {
  status: 'idle' | 'loading' | 'redirecting' | 'polling' | 'verified' | 'error';
  error?: string;
  verificationId?: string;
  referenceId?: number;
  orderId?: string;
  verifiedData?: any;
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Step 2
    gstNumber: '',
    sellsNonGstProducts: false,
    storeName: '',
    description: '',
    businessType: '',
    categorySelectionType: 'all',
    selectedCategories: [] as string[],
    // Step 3
    shippingMethod: 'easy_ship',
    offerFreeDelivery: true,
    deliveryCharge1to3Days: '',
    deliveryCharge3PlusDays: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsDialog, setTermsDialog] = useState<'tos' | 'seller' | null>(null);
  const [termsScrolled, setTermsScrolled] = useState({ tos: false, seller: false });
  const [termsAccepted, setTermsAccepted] = useState({ tos: false, seller: false });
  const [emailOtp, setEmailOtp] = useState<OtpState>({ sent: false, verified: false, loading: false });
  const [phoneOtp, setPhoneOtp] = useState<OtpState>({ sent: false, verified: false, loading: false });
  const [emailOtpInput, setEmailOtpInput] = useState('');
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [captcha, setCaptcha] = useState<CaptchaState>({ loading: false, solved: false, mode: 'recaptcha' });
  const [mathAnswer, setMathAnswer] = useState('');
  const recaptchaScriptLoaded = useRef(false);
  const [gstVerification, setGstVerification] = useState<VerificationState>({ status: 'idle' });
  const [bankVerification, setBankVerification] = useState<VerificationState>({ status: 'idle' });
  const [aadhaar, setAadhaar] = useState<AadhaarState>({ status: 'idle' });

  /** Last 10 digits from profile phone (for invalidating session-verified OTP if user edits the field). */
  const sessionPhoneDigitsRef = useRef<string | null>(null);
  const sessionEmailLowerRef = useRef<string | null>(null);

  // Signature state
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string>('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signatureUploadedUrl, setSignatureUploadedUrl] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);
  const pointsRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const strokeHistoryRef = useRef<ImageData[]>([]);

  const resetToStep1 = useCallback(() => {
    setSellerId(null);
    setCurrentStep(1);
    setLoading(false);
    setErrors({});
    try { sessionStorage.removeItem('xelnova-reg'); } catch { /* ignore */ }
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Persist sellerId + step so the user can resume after page refresh
  useEffect(() => {
    if (sellerId && currentStep > 1) {
      try {
        sessionStorage.setItem('xelnova-reg', JSON.stringify({ sellerId, step: currentStep, email: formData.email }));
      } catch { /* ignore */ }
    }
  }, [sellerId, currentStep, formData.email]);

  // On mount: try to resume from sessionStorage or URL param
  useEffect(() => {
    if (resumeChecked) return;
    setResumeChecked(true);

    try {
      const saved = sessionStorage.getItem('xelnova-reg');
      if (saved) {
        const { sellerId: savedId, step, email } = JSON.parse(saved);
        if (savedId && step >= 2) {
          setSellerId(savedId);
          setCurrentStep(step);
          if (email) setFormData(prev => ({ ...prev, email }));
          return;
        }
      }
    } catch { /* ignore */ }
  }, [resumeChecked]);

  // Logged-in user (e.g. phone OTP at login): reflect already-verified email/phone so we do not ask for OTP again.
  // Google OAuth users typically have phoneVerified false until they complete phone verification — they still verify here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getDashboardToken()) return;
      try {
        const u = await apiGetUserProfile();
        if (cancelled) return;
        const digits = (u.phone || '').replace(/\D/g, '');
        const ten = digits.length >= 10 ? digits.slice(-10) : '';
        sessionPhoneDigitsRef.current = ten || null;
        sessionEmailLowerRef.current = u.email ? u.email.trim().toLowerCase() : null;

        setFormData((prev) => ({
          ...prev,
          fullName: prev.fullName || u.name || '',
          email: prev.email || u.email || '',
          phone: prev.phone || ten,
        }));

        if (u.emailVerified) {
          setEmailOtp((prev) => ({
            ...prev,
            verified: true,
            sent: false,
            loading: false,
            token: prev.token || SESSION_VERIFIED_TOKEN,
          }));
        }
        if (u.phoneVerified && ten) {
          setPhoneOtp((prev) => ({
            ...prev,
            verified: true,
            sent: false,
            loading: false,
            token: prev.token || SESSION_VERIFIED_TOKEN,
          }));
        }
      } catch {
        /* unauthenticated or profile error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const ten = sessionPhoneDigitsRef.current;
    const p = formData.phone.replace(/\D/g, '').slice(-10);
    if (!ten || p.length !== 10) return;
    if (phoneOtp.verified && phoneOtp.token === SESSION_VERIFIED_TOKEN && p !== ten) {
      setPhoneOtp((prev) => ({ ...prev, verified: false, token: undefined, error: undefined }));
    }
  }, [formData.phone, phoneOtp.verified, phoneOtp.token]);

  useEffect(() => {
    const em = sessionEmailLowerRef.current;
    const cur = formData.email.trim().toLowerCase();
    if (!em || !cur) return;
    if (emailOtp.verified && emailOtp.token === SESSION_VERIFIED_TOKEN && cur !== em) {
      setEmailOtp((prev) => ({ ...prev, verified: false, token: undefined, error: undefined }));
    }
  }, [formData.email, emailOtp.verified, emailOtp.token]);

  // ========== Captcha ==========

  const loadMathCaptcha = useCallback(async () => {
    setCaptcha(prev => ({ ...prev, loading: true, error: undefined, mode: 'math' }));
    setMathAnswer('');
    try {
      const res = await fetch(`${API_BASE}/seller-onboarding/captcha/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'MATH' }),
      });
      if (!res.ok) {
        setCaptcha({ loading: false, solved: false, mode: 'math', error: 'Failed to load captcha. Please try again.' });
        return;
      }
      const data = await res.json();
      const puzzle = data.data;
      setCaptcha({
        loading: false,
        solved: false,
        mode: 'math',
        mathPuzzle: { sessionId: puzzle.sessionId, instruction: puzzle.puzzle.instruction },
      });
    } catch {
      setCaptcha({ loading: false, solved: false, mode: 'math', error: 'Unable to reach the server.' });
    }
  }, []);

  const solveMathCaptcha = useCallback(async (answer: string) => {
    if (!captcha.mathPuzzle || !answer.trim()) return;
    setCaptcha(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      const res = await fetch(`${API_BASE}/seller-onboarding/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: captcha.mathPuzzle!.sessionId, answer: answer.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCaptcha({ loading: false, solved: true, token: data.data.captchaToken, mode: 'math' });
      } else {
        setCaptcha(prev => ({ ...prev, loading: false, error: data.message || 'Incorrect answer.' }));
      }
    } catch {
      setCaptcha(prev => ({ ...prev, loading: false, error: 'Unable to reach the server.' }));
    }
  }, [captcha.mathPuzzle]);

  const executeRecaptcha = useCallback(async () => {
    setCaptcha(prev => ({ ...prev, loading: true, error: undefined, mode: 'recaptcha' }));
    try {
      if (!RECAPTCHA_SITE_KEY || !window.grecaptcha?.enterprise) {
        loadMathCaptcha();
        return;
      }
      let recaptchaToken: string;
      try {
        recaptchaToken = await new Promise<string>((resolve, reject) => {
          window.grecaptcha!.enterprise!.ready(async () => {
            try {
              const token = await window.grecaptcha!.enterprise!.execute(RECAPTCHA_SITE_KEY, { action: 'REGISTER' });
              resolve(token);
            } catch (err) { reject(err); }
          });
        });
      } catch {
        loadMathCaptcha();
        return;
      }
      const res = await fetch(`${API_BASE}/seller-onboarding/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'recaptcha', answer: recaptchaToken }),
      });
      if (!res.ok) { loadMathCaptcha(); return; }
      const data = await res.json();
      if (data.success) {
        setCaptcha({ loading: false, solved: true, token: data.data.captchaToken, mode: 'recaptcha' });
      } else {
        loadMathCaptcha();
      }
    } catch {
      loadMathCaptcha();
    }
  }, [loadMathCaptcha]);

  useEffect(() => {
    if (recaptchaScriptLoaded.current || !RECAPTCHA_SITE_KEY) return;
    const existing = document.querySelector('script[src*="recaptcha/enterprise.js"]');
    if (existing) { recaptchaScriptLoaded.current = true; return; }
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => { recaptchaScriptLoaded.current = true; };
    document.head.appendChild(script);
  }, []);

  // OTP cooldown timers
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setTimeout(() => setEmailCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const t = setTimeout(() => setPhoneCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneCooldown]);

  // ========== OTP ==========

  const sendOtp = async (type: 'EMAIL' | 'PHONE') => {
    const identifier = type === 'EMAIL' ? formData.email : formData.phone;
    const setOtpState = type === 'EMAIL' ? setEmailOtp : setPhoneOtp;
    const setCooldown = type === 'EMAIL' ? setEmailCooldown : setPhoneCooldown;

    if (!identifier) {
      setErrors(prev => ({ ...prev, [type.toLowerCase()]: `${type === 'EMAIL' ? 'Email' : 'Phone'} is required` }));
      return;
    }

    setOtpState(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      const res = await fetch(`${API_BASE}/seller-onboarding/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, type, purpose: 'REGISTRATION' }),
      });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {
        setOtpState(prev => ({ ...prev, loading: false, error: `Invalid response (HTTP ${res.status}).` }));
        return;
      }
      if (res.ok && data.success) {
        setOtpState({ sent: true, verified: false, loading: false, expiresIn: data.data?.expiresIn });
        setCooldown(60);
        if (data.data?.devOtp) alert(`[Dev Mode] Your OTP is: ${data.data.devOtp}`);
      } else {
        setOtpState(prev => ({ ...prev, loading: false, error: data.message || `Failed to send OTP (${res.status})` }));
        if (res.status === 429) setCooldown(60);
      }
    } catch (e) {
      setOtpState(prev => ({ ...prev, loading: false, error: e instanceof Error ? e.message : 'Failed to send OTP' }));
    }
  };

  const verifyOtp = async (type: 'EMAIL' | 'PHONE') => {
    const identifier = type === 'EMAIL' ? formData.email : formData.phone;
    const otp = type === 'EMAIL' ? emailOtpInput : phoneOtpInput;
    const setOtpState = type === 'EMAIL' ? setEmailOtp : setPhoneOtp;

    if (!otp || otp.length !== 6) {
      setOtpState(prev => ({ ...prev, error: 'Enter 6-digit OTP' }));
      return;
    }

    setOtpState(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      const res = await fetch(`${API_BASE}/seller-onboarding/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, type, otp }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpState({ sent: true, verified: true, loading: false, token: data.data.verificationToken });
      } else {
        setOtpState(prev => ({ ...prev, loading: false, error: data.message }));
      }
    } catch {
      setOtpState(prev => ({ ...prev, loading: false, error: 'Verification failed' }));
    }
  };

  // ========== GST ==========

  const extractErrorMessage = (data: any, fallback: string): string => {
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.message?.message === 'string') return data.message.message;
    if (Array.isArray(data?.message)) return data.message.filter((m: unknown) => typeof m === 'string').join('. ') || fallback;
    if (typeof data?.error === 'string') return data.error;
    return fallback;
  };

  const verifyGst = async () => {
    if (!formData.gstNumber || formData.gstNumber.length !== 15) return;
    setGstVerification({ status: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/verification/gstin/${formData.gstNumber.toUpperCase()}`);
      let data: any;
      try { data = await res.json(); } catch {
        setGstVerification({ status: 'error', error: 'GST verification service is temporarily unavailable. Please try again later.' });
        return;
      }
      if (data.success) {
        setGstVerification({ status: 'verified', data: data.data });
        if (data.data.tradeName) {
          setFormData(prev => ({ ...prev, storeName: prev.storeName || data.data.tradeName }));
        }
      } else {
        setGstVerification({ status: 'error', error: extractErrorMessage(data, 'GST verification failed. Please try again.') });
      }
    } catch {
      setGstVerification({ status: 'error', error: 'Unable to reach the server. Please check your connection and try again.' });
    }
  };

  // ========== Aadhaar (Digilocker) ==========

  const startAadhaarDigilocker = async () => {
    setAadhaar({ status: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/verification/aadhaar/digilocker/create-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      let data: any;
      try { data = await res.json(); } catch {
        setAadhaar({ status: 'error', error: 'Aadhaar verification service is temporarily unavailable. Please try again later.' });
        return;
      }
      if (!data.success) {
        setAadhaar({ status: 'error', error: extractErrorMessage(data, 'Failed to start Aadhaar verification. Please try again.') });
        return;
      }

      const { verificationId, referenceId, orderId, url } = data.data;

      if (!url) {
        setAadhaar({ status: 'error', error: 'Digilocker URL was not returned. Please try again.' });
        return;
      }

      setAadhaar({ status: 'redirecting', verificationId, referenceId, orderId });

      const popup = window.open(url, 'digilocker_aadhaar', 'width=600,height=700,scrollbars=yes');

      if (!popup) {
        setAadhaar(prev => ({ ...prev, status: 'error', error: 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.' }));
        return;
      }

      let resolved = false;

      const closePopupSafely = () => {
        try { popup.close(); } catch { /* cross-origin — browser may block */ }
      };

      const tryFetchDoc = async (): Promise<boolean> => {
        try {
          const docRes = await fetch(`${API_BASE}/verification/digilocker/get-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verificationId, referenceId: String(referenceId), orderId, documentType: 'AADHAAR' }),
          });
          const docData = await docRes.json();
          if (docData.success) {
            resolved = true;
            setAadhaar(prev => ({ ...prev, status: 'verified', verifiedData: docData.data }));
            closePopupSafely();
            return true;
          }
        } catch { /* network error — will retry */ }
        return false;
      };

      const onDigilockerMessage = async (event: MessageEvent) => {
        if (event.data?.type !== 'digilocker-done') return;
        window.removeEventListener('message', onDigilockerMessage);
        closePopupSafely();
        if (!resolved) {
          for (let i = 0; i < 5 && !resolved; i++) {
            if (i > 0) await new Promise(r => setTimeout(r, 2000));
            if (await tryFetchDoc()) return;
          }
        }
      };
      window.addEventListener('message', onDigilockerMessage);

      let pollCount = 0;
      const maxPolls = 60;
      const docPollInterval = setInterval(async () => {
        if (resolved || pollCount >= maxPolls) { clearInterval(docPollInterval); return; }
        pollCount++;
        if (pollCount >= 2) {
          const success = await tryFetchDoc();
          if (success) clearInterval(docPollInterval);
        }
      }, 4000);

      const closePollInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(closePollInterval);
          if (!resolved) {
            setAadhaar(prev => ({ ...prev, status: 'polling' }));
            (async () => {
              for (let i = 0; i < 3 && !resolved; i++) {
                if (i > 0) await new Promise(r => setTimeout(r, 2000));
                if (await tryFetchDoc()) return;
              }
              if (!resolved) {
                resolved = true;
                clearInterval(docPollInterval);
                setAadhaar(prev => ({ ...prev, status: 'error', error: 'Aadhaar verification was not completed. Please try again.' }));
              }
            })();
          }
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(docPollInterval);
        clearInterval(closePollInterval);
        window.removeEventListener('message', onDigilockerMessage);
        if (!resolved) {
          resolved = true;
          closePopupSafely();
          setAadhaar(prev => {
            if (prev.status === 'redirecting' || prev.status === 'polling') {
              return { ...prev, status: 'error', error: 'Verification timed out. Please try again.' };
            }
            return prev;
          });
        }
      }, 5 * 60 * 1000);
    } catch {
      setAadhaar({ status: 'error', error: 'Unable to reach the server. Please check your connection and try again.' });
    }
  };

  // ========== Bank (single penny-drop verification) ==========

  const verifyBankAccount = async () => {
    if (!formData.accountNumber || !/^[0-9]{9,18}$/.test(formData.accountNumber)) return;
    if (!formData.ifscCode || formData.ifscCode.length !== 11) return;
    setBankVerification({ status: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/verification/penny-drop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: formData.accountNumber, ifscCode: formData.ifscCode.toUpperCase() }),
      });
      let data: any;
      try { data = await res.json(); } catch {
        setBankVerification({ status: 'error', error: 'Bank verification service is temporarily unavailable. Please try again later.' });
        return;
      }
      if (data.success) {
        setBankVerification({ status: 'verified', data: data.data });
        if (data.data.nameAtBank && !formData.accountHolderName) {
          setFormData(prev => ({ ...prev, accountHolderName: data.data.nameAtBank }));
        }
      } else {
        setBankVerification({ status: 'error', error: extractErrorMessage(data, 'Bank account verification failed. Please try again.') });
      }
    } catch {
      setBankVerification({ status: 'error', error: 'Unable to reach the server. Please check your connection and try again.' });
    }
  };

  // ========== Signature Canvas (Bézier + velocity-based width) ==========

  const SIG_MIN_WIDTH = 1.2;
  const SIG_MAX_WIDTH = 4.5;
  const SIG_VELOCITY_FILTER = 0.7;
  const SIG_INK_COLOR = '#1a1a2e';

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cssW = w / dpr;
    const cssH = h / dpr;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cssW, cssH);
    strokeHistoryRef.current = [];
    pointsRef.current = [];
    setHasDrawn(false);
    setSignatureDataUrl('');
  }, []);

  /** Re-sync backing store if layout/CSS size drifted from last init (fixes stroke offset). */
  const ensureCanvasMatchesDisplay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) initCanvas();
  }, [initCanvas]);

  useEffect(() => {
    if (currentStep !== 3 || signatureMode !== 'draw') return;

    const raf = requestAnimationFrame(() => initCanvas());

    const canvas = canvasRef.current;
    if (!canvas) return () => cancelAnimationFrame(raf);

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => initCanvas());
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [currentStep, signatureMode, initCanvas]);

  const getPointerClientXY = (e: React.MouseEvent | React.TouchEvent): { clientX: number; clientY: number } | null => {
    if ('touches' in e) {
      if (e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      return null;
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  /**
   * Pointer position in the same coordinate space as drawing: CSS pixels relative to the canvas
   * layout box (matches ctx.setTransform(dpr, 0, 0, dpr, 0, 0)).
   */
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const p = getPointerClientXY(e);
    if (!p) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: p.clientX - rect.left,
      y: p.clientY - rect.top,
    };
  };

  const widthFromVelocity = (v: number) => {
    const clamped = Math.max(0, Math.min(v, 8));
    return SIG_MAX_WIDTH - (SIG_MAX_WIDTH - SIG_MIN_WIDTH) * (clamped / 8);
  };

  const drawBezierSegment = (
    ctx: CanvasRenderingContext2D,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    startW: number,
    endW: number,
  ) => {
    const steps = Math.max(Math.ceil(Math.hypot(p2.x - p0.x, p2.y - p0.y) / 2), 1);
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;
      const x1 = (1 - t1) * (1 - t1) * p0.x + 2 * (1 - t1) * t1 * p1.x + t1 * t1 * p2.x;
      const y1 = (1 - t1) * (1 - t1) * p0.y + 2 * (1 - t1) * t1 * p1.y + t1 * t1 * p2.y;
      const x2 = (1 - t2) * (1 - t2) * p0.x + 2 * (1 - t2) * t2 * p1.x + t2 * t2 * p2.x;
      const y2 = (1 - t2) * (1 - t2) * p0.y + 2 * (1 - t2) * t2 * p1.y + t2 * t2 * p2.y;
      const w = startW + (endW - startW) * t1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = SIG_INK_COLOR;
      ctx.stroke();
    }
  };

  const lastVelocityRef = useRef(0);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    ensureCanvasMatchesDisplay();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    strokeHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (strokeHistoryRef.current.length > 30) strokeHistoryRef.current.shift();

    isDrawingRef.current = true;
    setHasDrawn(true);
    const pos = getPos(e);
    pointsRef.current = [{ ...pos, t: Date.now() }];
    lastVelocityRef.current = 0;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, SIG_MAX_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = SIG_INK_COLOR;
    ctx.fill();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    const now = Date.now();
    const pts = pointsRef.current;
    pts.push({ ...pos, t: now });

    if (pts.length < 3) return;

    const p0 = pts[pts.length - 3];
    const p1 = pts[pts.length - 2];
    const p2 = pts[pts.length - 1];

    const dt = Math.max(p2.t - p0.t, 1);
    const dist = Math.hypot(p2.x - p0.x, p2.y - p0.y);
    const rawV = dist / dt;
    const velocity = SIG_VELOCITY_FILTER * rawV + (1 - SIG_VELOCITY_FILTER) * lastVelocityRef.current;
    lastVelocityRef.current = velocity;

    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    const midX2 = (p1.x + p2.x) / 2;
    const midY2 = (p1.y + p2.y) / 2;

    const startW = widthFromVelocity(lastVelocityRef.current);
    const endW = widthFromVelocity(velocity);

    drawBezierSegment(ctx, { x: midX, y: midY }, p1, { x: midX2, y: midY2 }, startW, endW);
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    pointsRef.current = [];
    if (canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
  };

  const undoStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prev = strokeHistoryRef.current.pop();
    if (prev) {
      ctx.putImageData(prev, 0, 0);
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    } else {
      const dpr = window.devicePixelRatio || 1;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      setSignatureDataUrl('');
      setHasDrawn(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setSignatureDataUrl('');
    setHasDrawn(false);
    strokeHistoryRef.current = [];
    pointsRef.current = [];
  };

  const uploadSignature = async (): Promise<string> => {
    if (signatureUploadedUrl) return signatureUploadedUrl;
    if (!sellerId) return '';

    let fileToUpload: File | null = null;

    if (signatureMode === 'upload' && signatureFile) {
      fileToUpload = signatureFile;
    } else if (signatureMode === 'draw' && signatureDataUrl) {
      const blob = await (await fetch(signatureDataUrl)).blob();
      fileToUpload = new File([blob], 'signature.png', { type: 'image/png' });
    }

    if (!fileToUpload) return '';

    setSignatureUploading(true);
    try {
      const form = new FormData();
      form.append('file', fileToUpload);
      form.append('type', 'SIGNATURE');
      const res = await fetch(`${API_BASE}/seller-onboarding/document/${sellerId}`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.success && data.data?.fileUrl) {
        setSignatureUploadedUrl(data.data.fileUrl);
        return data.data.fileUrl;
      }
      return '';
    } catch {
      return '';
    } finally {
      setSignatureUploading(false);
    }
  };

  // ========== Form Handling ==========

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (name === 'accountNumber' || name === 'ifscCode') {
      setBankVerification({ status: 'idle' });
    }
    if (errors[name] || errors.submit) {
      setErrors(prev => { const e = { ...prev }; delete e[name]; delete e.submit; return e; });
    }
  };

  const toggleCategory = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(cat)
        ? prev.selectedCategories.filter(c => c !== cat)
        : [...prev.selectedCategories, cat],
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
      if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
      else if (!/^[6-9]\d{9}$/.test(formData.phone)) newErrors.phone = 'Invalid phone number';
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Min 6 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords don't match";
      if (!emailOtp.verified) newErrors.email = 'Email not verified';
      if (!phoneOtp.verified) newErrors.phone = 'Phone not verified';
      if (!captcha.solved) newErrors.captcha = 'Complete the puzzle';
    }

    if (step === 2) {
      if (!formData.sellsNonGstProducts) {
        if (!formData.gstNumber.trim()) newErrors.gstNumber = 'GST number required';
        else if (gstVerification.status !== 'verified') newErrors.gstNumber = 'GST not verified';
      }
      if (aadhaar.status !== 'verified') {
        newErrors.aadhaar = 'Aadhaar verification via DigiLocker is mandatory';
      }
      if (!formData.storeName.trim()) newErrors.storeName = 'Store name required';
      else if (formData.storeName.length < 3) newErrors.storeName = 'Min 3 characters';
      if (formData.categorySelectionType === 'choose' && formData.selectedCategories.length === 0) {
        newErrors.selectedCategories = 'Select at least one category';
      }
    }

    if (step === 3) {
      if (signatureMode === 'draw' && !signatureDataUrl) newErrors.signature = 'Please draw your signature';
      if (signatureMode === 'upload' && !signatureFile) newErrors.signature = 'Please upload your signature';
      if (!formData.shippingMethod) newErrors.shippingMethod = 'Select shipping method';
      if (!formData.offerFreeDelivery) {
        if (!formData.deliveryCharge1to3Days) newErrors.deliveryCharge1to3Days = 'Enter delivery charge';
        if (!formData.deliveryCharge3PlusDays) newErrors.deliveryCharge3PlusDays = 'Enter delivery charge';
      }
      if (!formData.accountHolderName.trim()) newErrors.accountHolderName = 'Account holder name required';
      if (!formData.accountNumber.trim()) newErrors.accountNumber = 'Account number required';
      else if (!/^[0-9]{9,18}$/.test(formData.accountNumber)) newErrors.accountNumber = 'Invalid account number';
      if (!formData.ifscCode.trim()) newErrors.ifscCode = 'IFSC required';
      else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.toUpperCase())) newErrors.ifscCode = 'Invalid IFSC format';
      if (bankVerification.status !== 'verified') newErrors.accountNumber = newErrors.accountNumber || 'Bank account not verified';
      if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 1) {
      setLoading(true);
      try {
        const token = getDashboardToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/seller-onboarding/register/step-1`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            emailVerificationToken: emailOtp.token,
            phoneVerificationToken: phoneOtp.token,
            captchaToken: captcha.token,
          }),
        });
        const data = await res.json();
        if (data.success) {
          const nextStep = data.data.nextStep || 2;
          setSellerId(data.data.sellerId);
          setCurrentStep(nextStep);
        } else {
          setErrors({ submit: data.message || 'Registration failed' });
        }
      } catch {
        setErrors({ submit: 'Registration failed. Please try again.' });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (currentStep === 2 && sellerId) {
      setLoading(true);
      try {
        const gstData = gstVerification.status === 'verified' ? gstVerification.data : null;
        const res = await fetch(`${API_BASE}/seller-onboarding/step-2/${sellerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gstNumber: formData.sellsNonGstProducts ? undefined : formData.gstNumber.toUpperCase(),
            sellsNonGstProducts: formData.sellsNonGstProducts,
            gstVerified: gstVerification.status === 'verified',
            gstVerifiedData: gstData,
            aadhaarNumber: aadhaar.verifiedData?.uid || '',
            aadhaarVerified: aadhaar.status === 'verified',
            aadhaarVerifiedData: aadhaar.verifiedData,
            storeName: formData.storeName,
            description: formData.description,
            businessType: formData.businessType,
            categorySelectionType: formData.categorySelectionType,
            selectedCategories: formData.categorySelectionType === 'choose'
              ? formData.selectedCategories
              : categories.map((c) => c.value),
            businessAddress: gstData?.address,
            businessCity: gstData?.address?.split(', ').slice(-3, -2)[0],
            businessState: gstData?.address?.split(', ').slice(-2, -1)[0],
            businessPincode: gstData?.address?.split(', ').slice(-1)[0],
          }),
        });
        const data = await res.json();
        if (data.success) {
          setCurrentStep(3);
        } else if (res.status === 404) {
          setErrors({ submit: 'Session expired. Restarting.' });
          resetToStep1();
        } else {
          setErrors({ submit: data.message || 'Update failed' });
        }
      } catch {
        setErrors({ submit: 'Update failed. Please try again.' });
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3) || !sellerId) return;

    setLoading(true);
    try {
      const sigUrl = await uploadSignature();

      const res = await fetch(`${API_BASE}/seller-onboarding/step-3/${sellerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureUrl: sigUrl || undefined,
          signatureData: signatureMode === 'draw' ? signatureDataUrl : undefined,
          shippingMethod: formData.shippingMethod,
          offerFreeDelivery: formData.offerFreeDelivery,
          deliveryCharge1to3Days: formData.offerFreeDelivery ? undefined : parseFloat(formData.deliveryCharge1to3Days),
          deliveryCharge3PlusDays: formData.offerFreeDelivery ? undefined : parseFloat(formData.deliveryCharge3PlusDays),
          accountHolderName: formData.accountHolderName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode.toUpperCase(),
          skipBankVerification: bankVerification.status === 'verified',
          bankVerifiedData: bankVerification.status === 'verified' ? bankVerification.data : undefined,
        }),
      });
      const bankData = await res.json();

      if (!bankData.success) {
        setErrors({ submit: bankData.message || 'Failed to save details' });
        setLoading(false);
        return;
      }

      const submitRes = await fetch(`${API_BASE}/seller-onboarding/submit/${sellerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const submitData = await submitRes.json();

      if (submitData.success) {
        try {
          const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email, password: formData.password }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok && loginData.success && loginData.data) {
            const u = loginData.data.user;
            const sessionRes = await fetch('/api/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                token: loginData.data.accessToken,
                role: 'seller',
                user: { id: u.id, name: u.name, email: u.email, role: 'seller', avatar: u.avatar ?? null },
              }),
            });
            if (sessionRes.ok) { window.location.href = '/dashboard'; return; }
          }
        } catch { /* fall through */ }
        window.location.href = '/login?registered=true';
      } else {
        setErrors({ submit: submitData.message || 'Submission failed' });
      }
    } catch {
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const labelClass = 'block text-sm font-semibold text-gray-800 mb-2';
  const inputClass = (field: string) =>
    `w-full min-w-0 px-4 py-3.5 rounded-xl border text-[15px] ${
      errors[field]
        ? 'border-red-300 bg-red-50/80 ring-1 ring-red-200/60'
        : 'border-gray-200/90 bg-white shadow-sm hover:border-gray-300/90'
    } focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 focus:shadow-md outline-none transition-all duration-200 text-gray-900 placeholder:text-gray-400`;
  const selectClass = (field: string) =>
    `${inputClass(field)} min-h-[52px] cursor-pointer text-base bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 appearance-none`;

  // ========== Render ==========

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]">
      <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[4.25rem]">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <Image src="/xelnova-logo-dark.png" alt="Xelnova" width={140} height={36} className="h-7 w-auto" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-primary-600 pl-2 border-l border-gray-200">Seller</span>
            </Link>
            <Link href="/login" className="text-sm font-medium text-[#475569] hover:text-primary-600 transition-colors">
              Already registered? <span className="text-primary-600 font-semibold underline decoration-primary-600/30 underline-offset-2 hover:decoration-primary-600">Sign in</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-5">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <h3 className="font-display font-bold text-gray-900">Your progress</h3>
                  <span className="text-xs font-bold tabular-nums text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
                    {Math.round((currentStep / 3) * 100)}%
                  </span>
                </div>
                <div className="relative">
                  {steps.map((step, index) => {
                    const done = currentStep > step.id;
                    const active = currentStep === step.id;
                    return (
                      <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
                        {index < steps.length - 1 && (
                          <div className={`absolute left-[15px] top-10 w-0.5 h-[calc(100%-0.5rem)] rounded-full ${done ? 'bg-primary-200' : 'bg-gray-200'}`} aria-hidden />
                        )}
                        <div className={`relative z-[1] w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                          done ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25' : active ? 'bg-white text-primary-600 ring-2 ring-primary-500 ring-offset-2 ring-offset-white shadow-sm scale-105' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {done ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <span className="text-sm font-bold">{step.id}</span>}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className={`text-sm font-semibold transition-colors ${active || done ? 'text-gray-900' : 'text-gray-400'}`}>{step.title}</p>
                          <p className={`text-xs mt-0.5 leading-snug ${active ? 'text-gray-600' : 'text-gray-400'}`}>{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-lg shadow-primary-900/20 overflow-hidden relative">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
                <h3 className="font-display font-bold mb-4 relative">Why sell on Xelnova?</h3>
                <div className="space-y-3 relative">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-white/95">
                      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center ring-1 ring-white/20">
                        <benefit.icon size={16} />
                      </div>
                      <span className="font-medium">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-3">
            {/* Mobile Progress */}
            <div className="lg:hidden mb-6">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600">Onboarding</p>
                    <p className="text-sm font-semibold text-gray-900">Step {currentStep} · {steps[currentStep - 1]?.title}</p>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-primary-700 bg-primary-50 px-2.5 py-1.5 rounded-lg">{Math.round((currentStep / 3) * 100)}%</span>
                </div>
                <div className="flex gap-1.5 h-2 rounded-full bg-gray-100 p-0.5 overflow-hidden">
                  {steps.map((step) => (
                    <div key={step.id} className={`flex-1 rounded-full transition-all duration-500 ease-out ${currentStep >= step.id ? 'bg-primary-500' : 'bg-transparent'}`} />
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={currentStep === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
              <AnimatePresence mode="wait">
                <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.06)]">

                  {/* ===== STEP 1: Account ===== */}
                  {currentStep === 1 && (
                    <>
                      <StepHeader step={1} title="Create your account" description="Verify your email and phone, then set a secure password." />

                      {/* Captcha */}
                      <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield size={18} className="text-primary-600" />
                          <span className="text-sm font-semibold text-gray-800">Security verification</span>
                        </div>
                        {captcha.solved ? (
                          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                            <CheckCircle size={16} /> Verified
                          </div>
                        ) : captcha.mode === 'math' && captcha.mathPuzzle ? (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-700">{captcha.mathPuzzle.instruction}</p>
                            <div className="flex gap-2">
                              <input type="text" value={mathAnswer} onChange={(e) => setMathAnswer(e.target.value)} placeholder="Your answer" className={inputClass('captcha')} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), solveMathCaptcha(mathAnswer))} />
                              <Button type="button" onClick={() => solveMathCaptcha(mathAnswer)} loading={captcha.loading} size="sm">Verify</Button>
                            </div>
                            {captcha.error && <p className="text-xs text-red-500">{captcha.error}</p>}
                          </div>
                        ) : (
                          <button type="button" onClick={executeRecaptcha} disabled={captcha.loading}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition-colors w-full">
                            <div className={`w-6 h-6 rounded border-2 border-gray-300 flex items-center justify-center ${captcha.loading ? 'animate-spin' : ''}`}>
                              {captcha.loading ? <Loader2 size={14} className="text-gray-400" /> : null}
                            </div>
                            <span className="text-sm text-gray-700">Verify I&apos;m not a robot</span>
                          </button>
                        )}
                        {errors.captcha && <p className="text-xs text-red-500 mt-1">{errors.captcha}</p>}
                      </div>

                      {/* Full Name */}
                      <div className="mb-5">
                        <label className={labelClass}>Full Name *</label>
                        <div className="relative">
                          <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="As per government ID" className={`${inputClass('fullName')} pl-11`} />
                        </div>
                        {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                      </div>

                      {/* Email + OTP */}
                      <div className="mb-5">
                        <label className={labelClass}>Email Address *</label>
                        {emailOtp.verified ? (
                          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-green-200 bg-green-50/50">
                            <Mail size={18} className="text-green-600 shrink-0" />
                            <span className="text-[15px] font-medium text-gray-900 flex-1 truncate">{formData.email}</span>
                            <CheckCircle size={16} className="text-green-500 shrink-0" />
                            <button type="button" onClick={() => { setEmailOtp({ sent: false, verified: false, loading: false }); setEmailOtpInput(''); setEmailCooldown(0); }}
                              className="text-xs font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2 decoration-primary-600/30 hover:decoration-primary-600 transition-colors whitespace-nowrap">
                              Change
                            </button>
                          </div>
                        ) : !emailOtp.sent ? (
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className={`${inputClass('email')} pl-11`} />
                            </div>
                            <Button type="button" onClick={() => sendOtp('EMAIL')} loading={emailOtp.loading} disabled={emailCooldown > 0} size="sm" className="shrink-0">
                              {emailCooldown > 0 ? `${emailCooldown}s` : 'Send OTP'}
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-3 space-y-2.5">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail size={14} className="text-primary-500 shrink-0" />
                              <span className="truncate">OTP sent to <span className="font-semibold text-gray-800">{formData.email}</span></span>
                              <button type="button" onClick={() => { setEmailOtp({ sent: false, verified: false, loading: false }); setEmailOtpInput(''); setEmailCooldown(0); }}
                                className="ml-auto text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap">Change</button>
                            </div>
                            <div className="flex gap-2">
                              <input type="text" value={emailOtpInput} onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setEmailOtpInput(val);
                                if (val.length === 6) setTimeout(() => verifyOtp('EMAIL'), 100);
                              }}
                                placeholder="Enter 6-digit OTP" className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-center font-mono tracking-[0.3em] placeholder:tracking-normal placeholder:font-sans focus:border-primary-400 focus:ring-2 focus:ring-primary-500/10 outline-none transition-all"
                                maxLength={6} autoFocus />
                              <Button type="button" onClick={() => verifyOtp('EMAIL')} loading={emailOtp.loading} size="sm" className="shrink-0">Verify</Button>
                            </div>
                            <button type="button" onClick={() => sendOtp('EMAIL')} disabled={emailCooldown > 0}
                              className="text-xs font-medium text-gray-400 hover:text-gray-600 disabled:text-gray-300 transition-colors">
                              {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : 'Resend OTP'}
                            </button>
                          </div>
                        )}
                        {emailOtp.error && <p className="text-xs text-red-500 mt-1.5">{emailOtp.error}</p>}
                        {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email}</p>}
                      </div>

                      {/* Phone + OTP */}
                      <div className="mb-5">
                        <label className={labelClass}>Mobile Number *</label>
                        {phoneOtp.verified ? (
                          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-green-200 bg-green-50/50">
                            <Phone size={18} className="text-green-600 shrink-0" />
                            <span className="text-[15px] font-medium text-gray-900 flex-1">+91 {formData.phone}</span>
                            <CheckCircle size={16} className="text-green-500 shrink-0" />
                            <button type="button" onClick={() => { setPhoneOtp({ sent: false, verified: false, loading: false }); setPhoneOtpInput(''); setPhoneCooldown(0); }}
                              className="text-xs font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2 decoration-primary-600/30 hover:decoration-primary-600 transition-colors whitespace-nowrap">
                              Change
                            </button>
                          </div>
                        ) : !phoneOtp.sent ? (
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit number" className={`${inputClass('phone')} pl-11`} maxLength={10} />
                            </div>
                            <Button type="button" onClick={() => sendOtp('PHONE')} loading={phoneOtp.loading} disabled={phoneCooldown > 0} size="sm" className="shrink-0">
                              {phoneCooldown > 0 ? `${phoneCooldown}s` : 'Send OTP'}
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-3 space-y-2.5">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone size={14} className="text-primary-500 shrink-0" />
                              <span>OTP sent to <span className="font-semibold text-gray-800">+91 {formData.phone}</span></span>
                              <button type="button" onClick={() => { setPhoneOtp({ sent: false, verified: false, loading: false }); setPhoneOtpInput(''); setPhoneCooldown(0); }}
                                className="ml-auto text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap">Change</button>
                            </div>
                            <div className="flex gap-2">
                              <input type="text" value={phoneOtpInput} onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setPhoneOtpInput(val);
                                if (val.length === 6) setTimeout(() => verifyOtp('PHONE'), 100);
                              }}
                                placeholder="Enter 6-digit OTP" className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-center font-mono tracking-[0.3em] placeholder:tracking-normal placeholder:font-sans focus:border-primary-400 focus:ring-2 focus:ring-primary-500/10 outline-none transition-all"
                                maxLength={6} autoFocus />
                              <Button type="button" onClick={() => verifyOtp('PHONE')} loading={phoneOtp.loading} size="sm" className="shrink-0">Verify</Button>
                            </div>
                            <button type="button" onClick={() => sendOtp('PHONE')} disabled={phoneCooldown > 0}
                              className="text-xs font-medium text-gray-400 hover:text-gray-600 disabled:text-gray-300 transition-colors">
                              {phoneCooldown > 0 ? `Resend in ${phoneCooldown}s` : 'Resend OTP'}
                            </button>
                          </div>
                        )}
                        {phoneOtp.error && <p className="text-xs text-red-500 mt-1.5">{phoneOtp.error}</p>}
                        {errors.phone && <p className="text-xs text-red-500 mt-1.5">{errors.phone}</p>}
                      </div>

                      {/* Password */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div>
                          <label className={labelClass}>Password *</label>
                          <div className="relative">
                            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" className={`${inputClass('password')} pl-11 pr-11`} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                        </div>
                        <div>
                          <label className={labelClass}>Confirm Password *</label>
                          <div className="relative">
                            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type={showPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" className={`${inputClass('confirmPassword')} pl-11 pr-11`} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ===== STEP 2: Business Verification ===== */}
                  {currentStep === 2 && (
                    <>
                      <StepHeader step={2} title="Business Verification" description="Verify your GST, Aadhaar and set up your store." />

                      {/* GST */}
                      <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><FileText size={16} className="text-primary-600" /> GST Verification</h3>
                        <label className="flex items-center gap-2 mb-3 cursor-pointer">
                          <input type="checkbox" name="sellsNonGstProducts" checked={formData.sellsNonGstProducts} onChange={(e) => {
                            handleChange(e);
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, storeName: '', gstNumber: '' }));
                              setGstVerification({ status: 'idle' });
                            }
                          }} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                          <span className="text-sm text-gray-700">I sell non-GST products (e.g., Books)</span>
                        </label>
                        {!formData.sellsNonGstProducts && (
                          <div className="flex gap-2">
                            <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleChange} placeholder="15-digit GSTIN" className={`${inputClass('gstNumber')} flex-1 uppercase`} maxLength={15} />
                            <Button type="button" onClick={verifyGst} loading={gstVerification.status === 'loading'} disabled={gstVerification.status === 'verified'} size="sm" className="shrink-0">
                              {gstVerification.status === 'verified' ? <><CheckCircle size={14} /> Verified</> : 'Verify'}
                            </Button>
                          </div>
                        )}
                        {gstVerification.status === 'verified' && gstVerification.data && (
                          <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
                            <p className="font-medium text-green-800">Trade: {gstVerification.data.tradeName}</p>
                            <p className="text-green-700">Legal: {gstVerification.data.legalName}</p>
                            {gstVerification.data.address && <p className="text-green-600 text-xs mt-1">{gstVerification.data.address}</p>}
                          </div>
                        )}
                        {gstVerification.status === 'error' && <p className="text-xs text-red-500 mt-1">{gstVerification.error}</p>}
                        {errors.gstNumber && <p className="text-xs text-red-500 mt-1">{errors.gstNumber}</p>}
                      </div>

                      {/* Aadhaar (Digilocker) */}
                      <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Fingerprint size={16} className="text-primary-600" /> Aadhaar KYC Verification</h3>
                        <p className="text-xs text-gray-500 mb-3">Verify your Aadhaar via Digilocker — a secure government portal. No need to enter your Aadhaar number manually.</p>
                        {aadhaar.status === 'verified' && aadhaar.verifiedData ? (
                          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
                            <div className="flex items-center gap-2 mb-1"><CheckCircle size={14} className="text-green-600" /><span className="font-medium text-green-800">Aadhaar Verified via Digilocker</span></div>
                            <p className="text-green-700">Name: {aadhaar.verifiedData.name}</p>
                            <p className="text-green-600 text-xs">DOB: {aadhaar.verifiedData.dob} | Gender: {aadhaar.verifiedData.gender}</p>
                            {aadhaar.verifiedData.uid && <p className="text-green-600 text-xs">UID: xxxxxxxx{aadhaar.verifiedData.uid.slice(-4)}</p>}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Button
                              type="button"
                              onClick={startAadhaarDigilocker}
                              loading={aadhaar.status === 'loading' || aadhaar.status === 'redirecting' || aadhaar.status === 'polling'}
                              disabled={aadhaar.status === 'redirecting' || aadhaar.status === 'polling'}
                              size="sm"
                              variant="outline"
                              className="w-full"
                            >
                              <Fingerprint size={14} className="mr-1.5" />
                              {aadhaar.status === 'redirecting' ? 'Complete verification in Digilocker window...' :
                               aadhaar.status === 'polling' ? 'Fetching your Aadhaar data...' :
                               'Verify Aadhaar via Digilocker'}
                            </Button>
                            {(aadhaar.status === 'redirecting' || aadhaar.status === 'polling') && (
                              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                {aadhaar.status === 'redirecting'
                                  ? 'A Digilocker window has opened. Complete the verification there, then close the popup window.'
                                  : 'Fetching your verified Aadhaar data...'}
                              </div>
                            )}
                          </div>
                        )}
                        {aadhaar.error && <p className="text-xs text-red-500 mt-1">{aadhaar.error}</p>}
                        {errors.aadhaar && <p className="text-xs text-red-500 mt-1">{errors.aadhaar}</p>}
                      </div>

                      {/* Store Name */}
                      <div className="mb-5">
                        <label className={labelClass}>Store Name *</label>
                        {gstVerification.status === 'verified' && !formData.sellsNonGstProducts ? (
                          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-green-200 bg-green-50/50">
                            <Store size={18} className="text-green-600 shrink-0" />
                            <span className="text-[15px] font-medium text-gray-900">{formData.storeName}</span>
                            <CheckCircle size={14} className="text-green-500 shrink-0 ml-auto" />
                          </div>
                        ) : formData.sellsNonGstProducts ? (
                          <div className="relative">
                            <Store size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" name="storeName" value={formData.storeName} onChange={handleChange} placeholder="Enter your store name" className={`${inputClass('storeName')} pl-11`} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50/80 text-gray-400">
                            <Store size={18} className="shrink-0" />
                            <span className="text-[15px]">Verify GST to auto-fill store name</span>
                          </div>
                        )}
                        {!formData.sellsNonGstProducts && gstVerification.status === 'verified' && (
                          <p className="text-xs text-green-600 mt-1">Auto-filled from GST trade name</p>
                        )}
                        {errors.storeName && <p className="text-xs text-red-500 mt-1">{errors.storeName}</p>}
                      </div>

                      {/* Category Selection */}
                      <div className="mb-5">
                        <label className={labelClass}>Category</label>
                        <div className="flex gap-4 mb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="categorySelectionType" value="all" checked={formData.categorySelectionType === 'all'} onChange={handleChange} className="text-primary-600 focus:ring-primary-500" />
                            <span className="text-sm text-gray-700">All Categories</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="categorySelectionType" value="choose" checked={formData.categorySelectionType === 'choose'} onChange={handleChange} className="text-primary-600 focus:ring-primary-500" />
                            <span className="text-sm text-gray-700">Choose Categories</span>
                          </label>
                        </div>
                        {formData.categorySelectionType === 'choose' && (
                          <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => (
                              <button key={cat.value} type="button" onClick={() => toggleCategory(cat.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                                  formData.selectedCategories.includes(cat.value)
                                    ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}>
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {errors.selectedCategories && <p className="text-xs text-red-500 mt-1">{errors.selectedCategories}</p>}
                      </div>
                    </>
                  )}

                  {/* ===== STEP 3: Final Setup ===== */}
                  {currentStep === 3 && (
                    <>
                      <StepHeader step={3} title="Final Setup" description="Add your signature, shipping preferences, and bank details." />

                      {/* Signature */}
                      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 pt-4 pb-3">
                          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><PenTool size={16} className="text-primary-600" /> Signature *</h3>
                          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
                            <button type="button" onClick={() => setSignatureMode('draw')} className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${signatureMode === 'draw' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                              <Pencil size={12} />Draw
                            </button>
                            <button type="button" onClick={() => setSignatureMode('upload')} className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${signatureMode === 'upload' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                              <Upload size={12} />Upload
                            </button>
                          </div>
                        </div>
                        {signatureMode === 'draw' ? (
                          <div className="px-4 pb-4">
                            <div className="relative rounded-xl border border-gray-200 bg-white shadow-inner overflow-hidden group" style={{ touchAction: 'none' }}>
                              {!hasDrawn && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 select-none">
                                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                    <PenTool size={18} className="text-gray-300" />
                                  </div>
                                  <p className="text-sm text-gray-300 font-medium">Sign here</p>
                                </div>
                              )}
                              <div className="absolute bottom-5 left-6 right-6 border-b border-dashed border-gray-200 pointer-events-none" />
                              <canvas
                                ref={canvasRef}
                                className="w-full relative z-20"
                                style={{ height: 200, cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%231a1a2e\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z\'/%3E%3Cpath d=\'m15 5 4 4\'/%3E%3C/svg%3E") 2 22, crosshair' }}
                                onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-2.5 px-0.5">
                              <p className="text-[11px] text-gray-400">Draw your signature above using mouse or touch</p>
                              <div className="flex gap-1">
                                <button type="button" onClick={undoStroke} disabled={strokeHistoryRef.current.length === 0 && !hasDrawn}
                                  className="px-2.5 py-1 rounded-md text-xs font-medium text-gray-500 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:bg-transparent transition-colors flex items-center gap-1">
                                  <Undo2 size={11} /> Undo
                                </button>
                                <button type="button" onClick={clearCanvas} disabled={!hasDrawn}
                                  className="px-2.5 py-1 rounded-md text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:bg-transparent transition-colors flex items-center gap-1">
                                  <Trash2 size={11} /> Clear
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 pb-4">
                            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSignatureFile(file);
                                setSignaturePreview(URL.createObjectURL(file));
                              }
                            }} className="hidden" id="sig-upload" />
                            <label htmlFor="sig-upload" className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-gray-200 bg-white cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-all duration-200 group">
                              {signaturePreview ? (
                                <div className="relative">
                                  <Image src={signaturePreview} alt="Signature" width={200} height={112} className="max-h-28 object-contain" />
                                  <p className="text-xs text-gray-400 mt-3 text-center">Click to replace</p>
                                </div>
                              ) : (
                                <>
                                  <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center mb-3 transition-colors">
                                    <Upload size={20} className="text-gray-400 group-hover:text-primary-500 transition-colors" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-600 group-hover:text-primary-700 transition-colors">Click to upload signature</span>
                                  <span className="text-xs text-gray-400 mt-1">PNG, JPG or WebP</span>
                                </>
                              )}
                            </label>
                          </div>
                        )}
                        {errors.signature && <p className="text-xs text-red-500 px-4 pb-3">{errors.signature}</p>}
                      </div>

                      {/* Shipping */}
                      <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Truck size={16} className="text-primary-600" /> Shipping Preferences</h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {[{ value: 'easy_ship', label: 'Easy Ship', desc: 'Xelnova handles shipping' }, { value: 'self_ship', label: 'Self Ship', desc: 'You handle shipping' }].map((opt) => (
                            <label key={opt.value} className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-colors ${formData.shippingMethod === opt.value ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                              <div className="flex items-center gap-2">
                                <input type="radio" name="shippingMethod" value={opt.value} checked={formData.shippingMethod === opt.value} onChange={handleChange} className="text-primary-600 focus:ring-primary-500" />
                                <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                              </div>
                              <span className="text-xs text-gray-500 ml-6">{opt.desc}</span>
                            </label>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 mb-3 cursor-pointer">
                          <input type="checkbox" name="offerFreeDelivery" checked={formData.offerFreeDelivery} onChange={handleChange} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                          <span className="text-sm text-gray-700">Offer free delivery</span>
                        </label>
                        {!formData.offerFreeDelivery && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">1-3 days (₹)</label>
                              <input type="number" name="deliveryCharge1to3Days" value={formData.deliveryCharge1to3Days} onChange={handleChange} placeholder="e.g. 40" className={inputClass('deliveryCharge1to3Days')} />
                              {errors.deliveryCharge1to3Days && <p className="text-xs text-red-500 mt-1">{errors.deliveryCharge1to3Days}</p>}
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-1 block">3+ days (₹)</label>
                              <input type="number" name="deliveryCharge3PlusDays" value={formData.deliveryCharge3PlusDays} onChange={handleChange} placeholder="e.g. 60" className={inputClass('deliveryCharge3PlusDays')} />
                              {errors.deliveryCharge3PlusDays && <p className="text-xs text-red-500 mt-1">{errors.deliveryCharge3PlusDays}</p>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bank */}
                      <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><CreditCard size={16} className="text-primary-600" /> Bank Account Verification</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Account Number *</label>
                            <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} placeholder="9-18 digit account number" className={inputClass('accountNumber')} />
                            {errors.accountNumber && <p className="text-xs text-red-500 mt-1">{errors.accountNumber}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">IFSC Code *</label>
                            <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} placeholder="e.g. SBIN0001234" className={`${inputClass('ifscCode')} uppercase`} maxLength={11} />
                            {errors.ifscCode && <p className="text-xs text-red-500 mt-1">{errors.ifscCode}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 items-end mb-3">
                          <div className="flex-1">
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Account Holder Name *</label>
                            <input type="text" name="accountHolderName" value={formData.accountHolderName} onChange={handleChange} placeholder="Name as per bank records" className={inputClass('accountHolderName')} />
                            {errors.accountHolderName && <p className="text-xs text-red-500 mt-1">{errors.accountHolderName}</p>}
                          </div>
                          <Button type="button" onClick={verifyBankAccount} loading={bankVerification.status === 'loading'} disabled={bankVerification.status === 'verified'} size="sm" className="shrink-0 mb-0.5">
                            {bankVerification.status === 'verified' ? <><CheckCircle size={14} /> Verified</> : 'Verify Account'}
                          </Button>
                        </div>
                        {bankVerification.status === 'verified' && bankVerification.data && (
                          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
                            <p className="font-medium text-green-800">₹1 credited — {bankVerification.data.nameAtBank}</p>
                            <p className="text-green-700 text-xs">{bankVerification.data.bankName} — {bankVerification.data.branch}</p>
                          </div>
                        )}
                        {bankVerification.status === 'error' && <p className="text-xs text-red-500 mt-1">{bankVerification.error}</p>}
                      </div>

                      {/* Terms & Agreements */}
                      <div className="space-y-3 mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${termsAccepted.tos ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                            {termsAccepted.tos && <CheckCircle size={12} className="text-white" />}
                          </div>
                          <button type="button" onClick={() => setTermsDialog('tos')} className="text-sm text-primary-600 underline font-medium hover:text-primary-700">
                            Terms of Service {termsAccepted.tos ? '(Accepted)' : '(Read & Accept)'}
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${termsAccepted.seller ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                            {termsAccepted.seller && <CheckCircle size={12} className="text-white" />}
                          </div>
                          <button type="button" onClick={() => setTermsDialog('seller')} className="text-sm text-primary-600 underline font-medium hover:text-primary-700">
                            Seller Agreement {termsAccepted.seller ? '(Accepted)' : '(Read & Accept)'}
                          </button>
                        </div>
                      </div>
                      {errors.agreeTerms && <p className="text-xs text-red-500">{errors.agreeTerms}</p>}

                      {/* Terms Dialog */}
                      {termsDialog && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
                              <h3 className="text-lg font-bold text-gray-900">
                                {termsDialog === 'tos' ? 'Terms of Service' : 'Seller Agreement'}
                              </h3>
                              <button type="button" onClick={() => setTermsDialog(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                              </button>
                            </div>
                            <div
                              className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-700 leading-relaxed"
                              onScroll={(e) => {
                                const el = e.currentTarget;
                                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                                if (atBottom) setTermsScrolled(prev => ({ ...prev, [termsDialog]: true }));
                              }}
                            >
                              {termsDialog === 'tos' ? (
                                <div className="space-y-4">
                                  <h4 className="font-bold text-base">Xelnova Terms of Service</h4>
                                  <p>Last updated: April 2026</p>
                                  <p>Welcome to Xelnova. By accessing or using our platform, you agree to be bound by these Terms of Service. Please read them carefully.</p>
                                  <h5 className="font-semibold">1. Acceptance of Terms</h5>
                                  <p>By creating an account and using the Xelnova platform, you confirm that you have read, understood, and agree to these Terms. If you do not agree, you may not use the platform.</p>
                                  <h5 className="font-semibold">2. Account Registration</h5>
                                  <p>You must provide accurate and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years of age to create an account.</p>
                                  <h5 className="font-semibold">3. Platform Usage</h5>
                                  <p>You agree to use the platform only for lawful purposes. You shall not use the platform to sell prohibited items, engage in fraudulent activities, or violate any applicable laws or regulations.</p>
                                  <h5 className="font-semibold">4. Intellectual Property</h5>
                                  <p>All content on the Xelnova platform, including logos, designs, and software, is the property of Xelnova Private Limited. You may not copy, modify, or distribute any content without prior written consent.</p>
                                  <h5 className="font-semibold">5. Privacy</h5>
                                  <p>Your use of the platform is also governed by our Privacy Policy. We collect, use, and protect your data in accordance with applicable data protection laws.</p>
                                  <h5 className="font-semibold">6. Payment & Fees</h5>
                                  <p>Xelnova may charge commission fees on sales made through the platform. All fees will be transparently disclosed before any transaction. Payment processing is handled through secure third-party payment gateways.</p>
                                  <h5 className="font-semibold">7. Dispute Resolution</h5>
                                  <p>Any disputes arising from the use of the platform shall be resolved through arbitration in accordance with the laws of India. The jurisdiction shall be New Delhi, India.</p>
                                  <h5 className="font-semibold">8. Limitation of Liability</h5>
                                  <p>Xelnova shall not be liable for any indirect, incidental, or consequential damages arising from the use of the platform. Our total liability shall not exceed the fees paid by you in the preceding 12 months.</p>
                                  <h5 className="font-semibold">9. Termination</h5>
                                  <p>Xelnova reserves the right to suspend or terminate your account at any time for violation of these Terms. You may also terminate your account by contacting support.</p>
                                  <h5 className="font-semibold">10. Changes to Terms</h5>
                                  <p>Xelnova may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated Terms.</p>
                                  <p className="pt-4 font-medium">By scrolling to the bottom, you confirm you have read and understood these Terms.</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <h4 className="font-bold text-base">Xelnova Seller Agreement</h4>
                                  <p>Last updated: April 2026</p>
                                  <p>This Seller Agreement governs the relationship between you (the &quot;Seller&quot;) and Xelnova Private Limited (the &quot;Platform&quot;).</p>
                                  <h5 className="font-semibold">1. Seller Obligations</h5>
                                  <p>As a seller on Xelnova, you agree to: provide accurate product information, fulfill orders within the specified timeframe, maintain product quality standards, and comply with all applicable laws including GST regulations.</p>
                                  <h5 className="font-semibold">2. Product Listings</h5>
                                  <p>All product listings must be accurate, not misleading, and comply with Xelnova&apos;s listing policies. Xelnova reserves the right to remove any listing that violates these policies without prior notice.</p>
                                  <h5 className="font-semibold">3. Pricing & Commission</h5>
                                  <p>Sellers set their own prices. Xelnova charges a commission on each sale, which varies by category. The commission structure will be communicated during onboarding and may be updated with 30 days&apos; notice.</p>
                                  <h5 className="font-semibold">4. Payments & Settlements</h5>
                                  <p>Payments for completed orders will be settled to your registered bank account as per the payment cycle (typically 7-14 business days after delivery). Xelnova deducts applicable commission and fees before settlement.</p>
                                  <h5 className="font-semibold">5. Shipping & Delivery</h5>
                                  <p>Sellers using Easy Ship agree to Xelnova&apos;s shipping terms. Self-ship sellers must use approved carriers and provide valid tracking information. Delivery SLAs must be maintained.</p>
                                  <h5 className="font-semibold">6. Returns & Refunds</h5>
                                  <p>Sellers must honor Xelnova&apos;s return policy. Refunds for returned items will be deducted from future settlements. Sellers are responsible for quality issues that lead to returns.</p>
                                  <h5 className="font-semibold">7. Account Suspension</h5>
                                  <p>Xelnova may suspend or terminate your seller account for: policy violations, high return rates, poor seller ratings, fraudulent activities, or failure to fulfill orders.</p>
                                  <h5 className="font-semibold">8. Intellectual Property</h5>
                                  <p>You warrant that all products and content you list do not infringe on any third-party intellectual property rights. You are solely liable for any IP infringement claims.</p>
                                  <h5 className="font-semibold">9. Indemnification</h5>
                                  <p>You agree to indemnify and hold Xelnova harmless from any claims, damages, or expenses arising from your use of the platform, your products, or your violation of this Agreement.</p>
                                  <h5 className="font-semibold">10. Governing Law</h5>
                                  <p>This Agreement shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in New Delhi.</p>
                                  <p className="pt-4 font-medium">By scrolling to the bottom, you confirm you have read and understood this Seller Agreement.</p>
                                </div>
                              )}
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                              <button type="button" onClick={() => setTermsDialog(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={!termsScrolled[termsDialog]}
                                onClick={() => {
                                  setTermsAccepted(prev => ({ ...prev, [termsDialog]: true }));
                                  if (termsDialog === 'tos' && termsAccepted.seller) {
                                    setFormData(prev => ({ ...prev, agreeTerms: true }));
                                  } else if (termsDialog === 'seller' && termsAccepted.tos) {
                                    setFormData(prev => ({ ...prev, agreeTerms: true }));
                                  }
                                  setTermsDialog(null);
                                }}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-600/25"
                              >
                                {termsScrolled[termsDialog] ? 'I Accept' : 'Scroll to read all terms'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Error */}
                  {errors.submit && (
                    <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700">{errors.submit}</p>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                    {currentStep > 1 ? (
                      <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Back
                      </button>
                    ) : <div />}
                    {currentStep === 3 ? (
                      <button
                        type="submit"
                        disabled={loading || signatureUploading || !termsAccepted.tos || !termsAccepted.seller}
                        className="relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-[15px] font-bold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none transition-all duration-200 min-w-[200px] overflow-hidden group"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        {(loading || signatureUploading) ? (
                          <span className="relative flex items-center gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            Submitting...
                          </span>
                        ) : (
                          <span className="relative flex items-center gap-2">
                            <CheckCircle2 size={18} />
                            Submit Application
                          </span>
                        )}
                      </button>
                    ) : (
                      <Button type="submit" loading={loading} size="lg" className="min-w-[160px]">
                        Continue <ArrowRight size={16} className="ml-1" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
