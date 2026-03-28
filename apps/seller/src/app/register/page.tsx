'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Building2,
  MapPin,
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
  Wallet,
  Store,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import { Button } from '@xelnova/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
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

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

const steps = [
  { id: 1, title: 'Account', description: 'Email & Phone Verification', icon: User },
  { id: 2, title: 'Tax Details', description: 'GST & PAN Verification', icon: FileText },
  { id: 3, title: 'Store', description: 'Store Name & Category', icon: Store },
  { id: 4, title: 'Address', description: 'Pickup Location', icon: MapPin },
  { id: 5, title: 'Shipping', description: 'Delivery Preferences', icon: Truck },
  { id: 6, title: 'Bank', description: 'Payment Details', icon: CreditCard },
];

const benefits = [
  { icon: TrendingUp, text: 'Access 50L+ customers' },
  { icon: Truck, text: 'Free logistics support' },
  { icon: Shield, text: 'Secure payments' },
  { icon: Package, text: 'Easy inventory management' },
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
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-600 mb-1">Step {step} of 6</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 font-display tracking-tight leading-tight">{title}</h2>
          <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

const businessTypes = [
  { value: 'individual', label: 'Individual/Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'pvtLtd', label: 'Private Limited' },
  { value: 'llp', label: 'LLP' },
  { value: 'public', label: 'Public Limited' },
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

const indianStates = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala',
  'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

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
}

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sellerId, setSellerId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gstNumber: '',
    sellsNonGstProducts: false,
    panNumber: '',
    panName: '',
    storeName: '',
    description: '',
    businessType: '',
    businessCategory: '',
    pincode: '',
    city: '',
    state: '',
    address: '',
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
  const [emailOtp, setEmailOtp] = useState<OtpState>({ sent: false, verified: false, loading: false });
  const [phoneOtp, setPhoneOtp] = useState<OtpState>({ sent: false, verified: false, loading: false });
  const [emailOtpInput, setEmailOtpInput] = useState('');
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [captcha, setCaptcha] = useState<CaptchaState>({ loading: false, solved: false });
  const recaptchaScriptLoaded = useRef(false);
  const [gstVerification, setGstVerification] = useState<VerificationState>({ status: 'idle' });
  const [ifscVerification, setIfscVerification] = useState<VerificationState>({ status: 'idle' });
  const [bankVerification, setBankVerification] = useState<VerificationState>({ status: 'idle' });

  const [kycDocs, setKycDocs] = useState<{
    panCard: { file?: File; preview?: string; uploading: boolean; uploaded: boolean; url?: string };
    maskedAadhaar: { file?: File; preview?: string; uploading: boolean; uploaded: boolean; url?: string };
  }>({
    panCard: { uploading: false, uploaded: false },
    maskedAadhaar: { uploading: false, uploaded: false },
  });
  const kycDocsRef = useRef(kycDocs);
  kycDocsRef.current = kycDocs;

  const resetToStep1 = useCallback(() => {
    setSellerId(null);
    setCurrentStep(1);
    setLoading(false);
    setErrors({});
    setKycDocs({ panCard: { uploading: false, uploaded: false }, maskedAadhaar: { uploading: false, uploaded: false } });
  }, []);

  const handleKycFileSelect = (docType: 'panCard' | 'maskedAadhaar', file: File | null) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const typeOk =
      validTypes.includes(file.type) ||
      (!file.type && /\.(jpe?g|png|webp|pdf)$/i.test(file.name));
    if (!typeOk) {
      setErrors(prev => ({ ...prev, [docType]: 'Only JPG, PNG, WEBP, or PDF files are allowed' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [docType]: 'File must be less than 5MB' }));
      return;
    }
    const preview = isPdfFile(file) ? '' : URL.createObjectURL(file);
    setKycDocs(prev => {
      const prevPreview = prev[docType].preview;
      if (prevPreview) URL.revokeObjectURL(prevPreview);
      const next = { ...prev, [docType]: { file, preview, uploading: false, uploaded: false } };
      kycDocsRef.current = next;
      return next;
    });
    setErrors(prev => { const e = { ...prev }; delete e[docType]; return e; });
  };

  const uploadKycDocument = async (docType: 'panCard' | 'maskedAadhaar'): Promise<boolean> => {
    const doc = kycDocsRef.current[docType];
    if (!doc.file) return false;
    if (!sellerId) {
      setErrors(prev => ({ ...prev, [docType]: 'Session expired. Restarting from Step 1.' }));
      resetToStep1();
      return false;
    }
    if (doc.uploaded) return true;

    setKycDocs(prev => ({ ...prev, [docType]: { ...prev[docType], uploading: true } }));
    try {
      const formPayload = new FormData();
      formPayload.append('file', doc.file);
      formPayload.append('type', docType === 'panCard' ? 'PAN_CARD' : 'MASKED_AADHAAR');

      const res = await fetch(`${API_BASE}/seller-onboarding/document/${sellerId}`, {
        method: 'POST',
        body: formPayload,
      });
      const data = await res.json();
      if (data.success) {
        setKycDocs(prev => {
          const next = {
            ...prev,
            [docType]: { ...prev[docType], uploading: false, uploaded: true, url: data.data?.fileUrl },
          };
          kycDocsRef.current = next;
          return next;
        });
        return true;
      }
      if (res.status === 404 || (data.message && /seller not found/i.test(data.message))) {
        setErrors(prev => ({ ...prev, submit: 'Your registration session has expired. Restarting from Step 1.' }));
        resetToStep1();
        return false;
      }
      setErrors(prev => ({ ...prev, [docType]: data.message || 'Upload failed' }));
      setKycDocs(prev => {
        const next = { ...prev, [docType]: { ...prev[docType], uploading: false } };
        kycDocsRef.current = next;
        return next;
      });
      return false;
    } catch {
      setErrors(prev => ({ ...prev, [docType]: 'Upload failed. Try again.' }));
      setKycDocs(prev => {
        const next = { ...prev, [docType]: { ...prev[docType], uploading: false } };
        kycDocsRef.current = next;
        return next;
      });
      return false;
    }
  };

  const executeRecaptcha = useCallback(async () => {
    setCaptcha(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      if (!RECAPTCHA_SITE_KEY) {
        throw new Error('RECAPTCHA_CONFIG');
      }

      if (!window.grecaptcha?.enterprise) {
        throw new Error('RECAPTCHA_NOT_LOADED');
      }

      const recaptchaToken = await new Promise<string>((resolve, reject) => {
        window.grecaptcha!.enterprise!.ready(async () => {
          try {
            const token = await window.grecaptcha!.enterprise!.execute(RECAPTCHA_SITE_KEY, { action: 'REGISTER' });
            resolve(token);
          } catch (err) {
            reject(err);
          }
        });
      });

      const res = await fetch(`${API_BASE}/seller-onboarding/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'recaptcha', answer: recaptchaToken }),
      });
      const data = await res.json();
      if (data.success) {
        setCaptcha({ loading: false, solved: true, token: data.data.captchaToken });
      } else {
        setCaptcha({ loading: false, solved: false, error: data.message || 'Verification failed. Please try again.' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'RECAPTCHA_CONFIG') {
        setCaptcha({ loading: false, solved: false, error: 'Security verification is not configured. Please contact support.' });
      } else if (msg === 'RECAPTCHA_NOT_LOADED') {
        setCaptcha({ loading: false, solved: false, error: 'Security script is still loading. Please wait a moment and try again.' });
      } else if (err instanceof TypeError && msg.includes('fetch')) {
        setCaptcha({ loading: false, solved: false, error: 'Unable to reach the verification server. Please check your connection and try again.' });
      } else {
        setCaptcha({ loading: false, solved: false, error: 'Verification failed. Please refresh the page and try again.' });
      }
    }
  }, []);

  useEffect(() => {
    if (recaptchaScriptLoaded.current || !RECAPTCHA_SITE_KEY) return;
    const existing = document.querySelector('script[src*="recaptcha/enterprise.js"]');
    if (existing) { recaptchaScriptLoaded.current = true; return; }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => { recaptchaScriptLoaded.current = true; };
    script.onerror = () => {
      recaptchaScriptLoaded.current = false;
      setCaptcha(prev => ({ ...prev, error: 'Security script failed to load. Please refresh the page.' }));
    };
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

  // Send OTP
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
      let data: {
        success?: boolean;
        message?: string;
        error?: string;
        data?: { expiresIn?: number; devOtp?: string };
      } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        setOtpState(prev => ({
          ...prev,
          loading: false,
          error: `Invalid response from server (HTTP ${res.status}). Is the Nest backend running and NEXT_PUBLIC_API_URL set to …/api/v1?`,
        }));
        return;
      }
      if (res.ok && data.success) {
        setOtpState({ sent: true, verified: false, loading: false, expiresIn: data.data?.expiresIn });
        setCooldown(60);
        if (data.data?.devOtp) {
          alert(`[Dev Mode] Your OTP is: ${data.data.devOtp}`);
        }
      } else {
        setOtpState(prev => ({
          ...prev,
          loading: false,
          error: data.message || data.error || `Failed to send OTP (${res.status})`,
        }));
        if (res.status === 429) setCooldown(60);
      }
    } catch (e) {
      const net =
        e instanceof TypeError ||
        (e instanceof Error && /network|fetch|failed/i.test(e.message));
      setOtpState(prev => ({
        ...prev,
        loading: false,
        error: net
          ? `Cannot reach the API (${API_BASE}). Start the backend on port 4000 and set NEXT_PUBLIC_API_URL in apps/seller/.env.`
          : e instanceof Error
            ? e.message
            : 'Failed to send OTP',
      }));
    }
  };

  // Verify OTP
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

  // Verify GST
  const verifyGst = async () => {
    if (!formData.gstNumber || formData.gstNumber.length !== 15) return;
    
    setGstVerification({ status: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/verification/gstin/${formData.gstNumber.toUpperCase()}`);
      const data = await res.json();
      if (data.success) {
        setGstVerification({ status: 'verified', data: data.data });
        if (data.data.tradeName && !formData.storeName) {
          setFormData(prev => ({ ...prev, storeName: data.data.tradeName }));
        }
      } else {
        setGstVerification({ status: 'error', error: data.message });
      }
    } catch {
      setGstVerification({ status: 'error', error: 'Failed to verify GST' });
    }
  };

  // Verify IFSC
  const verifyIfsc = async () => {
    if (!formData.ifscCode || formData.ifscCode.length !== 11) return;
    
    setIfscVerification({ status: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/verification/ifsc/${formData.ifscCode.toUpperCase()}`);
      const data = await res.json();
      if (data.success) {
        setIfscVerification({ status: 'verified', data: data.data });
      } else {
        setIfscVerification({ status: 'error', error: data.message });
      }
    } catch {
      setIfscVerification({ status: 'error', error: 'Failed to verify IFSC' });
    }
  };

  // Verify Bank Account (Penny Drop)
  const verifyBankAccount = async () => {
    if (!formData.accountNumber || !/^[0-9]{9,18}$/.test(formData.accountNumber)) return;
    if (!formData.ifscCode || formData.ifscCode.length !== 11) return;

    setBankVerification({ status: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/verification/penny-drop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode.toUpperCase(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBankVerification({ status: 'verified', data: data.data });
        if (data.data.nameAtBank && !formData.accountHolderName) {
          setFormData(prev => ({ ...prev, accountHolderName: data.data.nameAtBank }));
        }
      } else {
        setBankVerification({ status: 'error', error: data.message });
      }
    } catch {
      setBankVerification({ status: 'error', error: 'Failed to verify bank account' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name] || errors.submit) {
      setErrors(prev => { const e = { ...prev }; delete e[name]; delete e.submit; return e; });
    }
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
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords don\'t match';
      if (!emailOtp.verified) newErrors.email = 'Email not verified';
      if (!phoneOtp.verified) newErrors.phone = 'Phone not verified';
      if (!captcha.solved) newErrors.captcha = 'Complete the puzzle';
    }

    if (step === 2) {
      if (!formData.sellsNonGstProducts) {
        if (!formData.gstNumber.trim()) newErrors.gstNumber = 'GST number required';
        else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstNumber.toUpperCase())) {
          newErrors.gstNumber = 'Invalid GST format';
        } else if (gstVerification.status !== 'verified') {
          newErrors.gstNumber = 'GST not verified';
        }
      }
      if (!formData.panNumber.trim()) newErrors.panNumber = 'PAN is required';
      else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
        newErrors.panNumber = 'Invalid PAN format';
      }
      if (!formData.panName.trim()) newErrors.panName = 'Name on PAN required';
      if (!kycDocs.panCard.file) newErrors.panCard = 'PAN card document is required';
      if (!kycDocs.maskedAadhaar.file) newErrors.maskedAadhaar = 'Masked Aadhaar document is required';
    }

    if (step === 3) {
      if (!formData.storeName.trim()) newErrors.storeName = 'Store name required';
      else if (formData.storeName.length < 3) newErrors.storeName = 'Min 3 characters';
      if (!formData.businessType) newErrors.businessType = 'Select business type';
      if (!formData.businessCategory) newErrors.businessCategory = 'Select category';
    }

    if (step === 4) {
      if (!formData.pincode.trim()) newErrors.pincode = 'Pincode required';
      else if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) newErrors.pincode = 'Invalid pincode';
      if (!formData.city.trim()) newErrors.city = 'City required';
      if (!formData.state) newErrors.state = 'State required';
      if (!formData.address.trim()) newErrors.address = 'Address required';
      else if (formData.address.length < 10) newErrors.address = 'Enter complete address';
    }

    if (step === 5) {
      if (!formData.shippingMethod) newErrors.shippingMethod = 'Select shipping method';
      if (!formData.offerFreeDelivery) {
        if (!formData.deliveryCharge1to3Days) newErrors.deliveryCharge1to3Days = 'Enter delivery charge';
        if (!formData.deliveryCharge3PlusDays) newErrors.deliveryCharge3PlusDays = 'Enter delivery charge';
      }
    }

    if (step === 6) {
      if (!formData.accountHolderName.trim()) newErrors.accountHolderName = 'Account holder name required';
      if (!formData.accountNumber.trim()) newErrors.accountNumber = 'Account number required';
      else if (!/^[0-9]{9,18}$/.test(formData.accountNumber)) newErrors.accountNumber = 'Invalid account number';
      if (!formData.ifscCode.trim()) newErrors.ifscCode = 'IFSC required';
      else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.toUpperCase())) {
        newErrors.ifscCode = 'Invalid IFSC format';
      } else if (ifscVerification.status !== 'verified') {
        newErrors.ifscCode = 'IFSC not verified';
      }
      if (bankVerification.status !== 'verified') {
        newErrors.accountNumber = newErrors.accountNumber || 'Bank account not verified via Penny Drop';
      }
      if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    // Step 1 - Create account
    if (currentStep === 1) {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/seller-onboarding/register/step-1`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          setSellerId(data.data.sellerId);
          const nextStep = data.data.nextStep ?? 2;
          setCurrentStep(nextStep > 6 ? 6 : nextStep);
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

    // Other steps - Update seller profile
    if (sellerId) {
      setLoading(true);
      try {
        if (currentStep === 2) {
          if (kycDocsRef.current.panCard.file) {
            const ok = await uploadKycDocument('panCard');
            if (!ok) { setLoading(false); return; }
          }
          if (kycDocsRef.current.maskedAadhaar.file) {
            const ok = await uploadKycDocument('maskedAadhaar');
            if (!ok) { setLoading(false); return; }
          }
        }

        const stepEndpoints: Record<number, { url: string; body: any }> = {
          2: {
            url: `${API_BASE}/seller-onboarding/step-2/${sellerId}`,
            body: {
              gstNumber: formData.sellsNonGstProducts ? undefined : formData.gstNumber.toUpperCase(),
              sellsNonGstProducts: formData.sellsNonGstProducts,
              panNumber: formData.panNumber.toUpperCase(),
              panName: formData.panName,
            },
          },
          3: {
            url: `${API_BASE}/seller-onboarding/step-3/${sellerId}`,
            body: {
              storeName: formData.storeName,
              description: formData.description,
              businessType: formData.businessType,
              businessCategory: formData.businessCategory,
            },
          },
          4: {
            url: `${API_BASE}/seller-onboarding/step-4/${sellerId}`,
            body: {
              pincode: formData.pincode,
              city: formData.city,
              state: formData.state,
              address: formData.address,
            },
          },
          5: {
            url: `${API_BASE}/seller-onboarding/step-5/${sellerId}`,
            body: {
              shippingMethod: formData.shippingMethod,
              offerFreeDelivery: formData.offerFreeDelivery,
              deliveryCharge1to3Days: formData.offerFreeDelivery ? undefined : parseFloat(formData.deliveryCharge1to3Days),
              deliveryCharge3PlusDays: formData.offerFreeDelivery ? undefined : parseFloat(formData.deliveryCharge3PlusDays),
            },
          },
        };

        const endpoint = stepEndpoints[currentStep];
        if (endpoint) {
          const res = await fetch(endpoint.url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(endpoint.body),
          });
          const data = await res.json();
          if (data.success) {
            setCurrentStep(prev => prev + 1);
          } else if (res.status === 404 || (data.message && /seller not found/i.test(data.message))) {
            setErrors({ submit: 'Your registration session has expired. Restarting from Step 1.' });
            resetToStep1();
          } else {
            setErrors({ submit: data.message || 'Update failed' });
          }
        } else {
          setCurrentStep(prev => prev + 1);
        }
      } catch {
        setErrors({ submit: 'Update failed. Please try again.' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(6) || !sellerId) return;

    setLoading(true);
    try {
      const bankRes = await fetch(`${API_BASE}/seller-onboarding/step-6/${sellerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountHolderName: formData.accountHolderName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode.toUpperCase(),
        }),
      });
      const bankData = await bankRes.json();
      
      if (!bankData.success) {
        setErrors({ submit: bankData.message || 'Failed to save bank details' });
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
            const dashboardUser = {
              id: u.id,
              name: u.name,
              email: u.email,
              role: 'seller',
              avatar: u.avatar ?? null,
            };

            const sessionRes = await fetch('/api/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                token: loginData.data.accessToken,
                role: 'seller',
                user: dashboardUser,
              }),
            });

            if (sessionRes.ok) {
              window.location.href = '/dashboard';
              return;
            }
          }
        } catch {
          // Auto-login failed; fall through to login page
        }

        window.location.href = '/login?registered=true';
        return;
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

  /** Native <select> needs text-base (16px) on iOS to avoid zoom; min-h matches other inputs */
  const selectClass = (field: string) =>
    `${inputClass(field)} min-h-[52px] cursor-pointer text-base bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 appearance-none`;

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[4.25rem]">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <Image src="/xelnova-logo-dark.png" alt="Xelnova" width={140} height={36} className="h-7 w-auto" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-primary-600 pl-2 border-l border-gray-200">
                Seller
              </span>
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-[#475569] hover:text-primary-600 transition-colors"
            >
              Already registered?{' '}
              <span className="text-primary-600 font-semibold underline decoration-primary-600/30 underline-offset-2 hover:decoration-primary-600">
                Sign in
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Left Sidebar - Progress */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-5">
              <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_32px_-8px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <h3 className="font-display font-bold text-gray-900">Your progress</h3>
                  <span className="text-xs font-bold tabular-nums text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
                    {Math.round((currentStep / 6) * 100)}%
                  </span>
                </div>
                <div className="relative">
                  {steps.map((step, index) => {
                    const done = currentStep > step.id;
                    const active = currentStep === step.id;
                    return (
                      <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
                        {index < steps.length - 1 && (
                          <div
                            className={`absolute left-[15px] top-10 w-0.5 h-[calc(100%-0.5rem)] rounded-full ${
                              done ? 'bg-primary-200' : 'bg-gray-200'
                            }`}
                            aria-hidden
                          />
                        )}
                        <div
                          className={`relative z-[1] w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                            done
                              ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25 scale-100'
                              : active
                                ? 'bg-white text-primary-600 ring-2 ring-primary-500 ring-offset-2 ring-offset-white shadow-sm scale-105'
                                : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {done ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <span className="text-sm font-bold">{step.id}</span>}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className={`text-sm font-semibold transition-colors ${active || done ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.title}
                          </p>
                          <p className={`text-xs mt-0.5 leading-snug ${active ? 'text-gray-600' : 'text-gray-400'}`}>{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-primary-600 via-primary-600 to-emerald-800 p-6 text-white shadow-lg shadow-primary-900/20 overflow-hidden relative">
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
                    <p className="text-sm font-semibold text-gray-900">
                      Step {currentStep} · {steps[currentStep - 1]?.title}
                    </p>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-primary-700 bg-primary-50 px-2.5 py-1.5 rounded-lg">
                    {Math.round((currentStep / 6) * 100)}%
                  </span>
                </div>
                <div className="flex gap-1.5 h-2 rounded-full bg-gray-100 p-0.5 overflow-hidden">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`flex-1 rounded-full transition-all duration-500 ease-out ${
                        currentStep > step.id ? 'bg-primary-400' : currentStep === step.id ? 'bg-primary-500 shadow-sm' : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="relative z-0 rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_24px_48px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-primary-400 via-primary-500 to-emerald-600" aria-hidden />
              <form onSubmit={handleSubmit}>
                <div className="p-5 sm:p-7 lg:p-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    >
                  {/* Step 1: Account */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <StepHeader
                        step={1}
                        title="Create your account"
                        description="Verify your email and phone, then set a secure password."
                      />

                      {/* reCAPTCHA Enterprise */}
                      <div className="rounded-xl border border-emerald-100/80 bg-gradient-to-b from-emerald-50/60 to-white p-4 sm:p-5">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Shield size={16} className="text-primary-600" />
                          Security verification
                        </h3>
                        
                        {captcha.solved ? (
                          <div className="flex items-center gap-3 text-green-600">
                            <CheckCircle size={24} />
                            <span className="font-medium">Verification completed successfully!</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={executeRecaptcha}
                              disabled={captcha.loading}
                              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 disabled:opacity-60"
                            >
                              {captcha.loading ? (
                                <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                              ) : (
                                <><Shield size={16} className="text-primary-600" /> Verify I&apos;m not a robot</>
                              )}
                            </button>
                            {captcha.error && (
                              <p className="text-red-500 text-sm flex items-center gap-1">
                                <XCircle size={14} /> {captcha.error}
                              </p>
                            )}
                          </div>
                        )}
                        {errors.captcha && <p className="text-red-500 text-sm mt-2">{errors.captcha}</p>}
                      </div>

                      {/* Personal Info */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Full Name *</label>
                          <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              name="fullName"
                              value={formData.fullName}
                              onChange={handleChange}
                              placeholder="As per government ID"
                              className={`${inputClass('fullName')} pl-11`}
                            />
                          </div>
                          {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>

                        {/* Email with OTP */}
                        <div>
                          <label className={labelClass}>Email Address *</label>
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                            <div className="relative min-w-0 flex-1">
                              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                disabled={emailOtp.verified}
                                className={`${inputClass('email')} pl-11 ${emailOtp.verified ? 'bg-green-50 border-green-300' : ''}`}
                              />
                              {emailOtp.verified && (
                                <CheckCircle size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                              )}
                            </div>
                            {emailOtp.verified ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEmailOtp({ sent: false, verified: false, loading: false });
                                  setEmailOtpInput('');
                                }}
                                className="h-12 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors sm:min-w-[6.5rem]"
                              >
                                <Pencil size={14} /> Change
                              </button>
                            ) : (
                              <Button
                                type="button"
                                onClick={() => sendOtp('EMAIL')}
                                disabled={emailOtp.loading || !formData.email || emailCooldown > 0}
                                className="h-12 w-full shrink-0 rounded-xl px-5 font-semibold shadow-md shadow-primary-500/20 sm:w-auto sm:min-w-[9rem]"
                              >
                                {emailOtp.loading ? <Loader2 size={16} className="animate-spin" /> : emailCooldown > 0 ? `Resend (${emailCooldown}s)` : emailOtp.sent ? 'Resend OTP' : 'Send OTP'}
                              </Button>
                            )}
                          </div>
                          {emailOtp.sent && !emailOtp.verified && (
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                type="text"
                                value={emailOtpInput}
                                onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                                className="h-12 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-center text-base tracking-[0.35em] outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
                                maxLength={6}
                              />
                              <Button
                                type="button"
                                onClick={() => verifyOtp('EMAIL')}
                                disabled={emailOtp.loading}
                                className="h-12 w-full shrink-0 rounded-xl px-6 font-semibold sm:w-auto sm:min-w-[6.5rem]"
                              >
                                {emailOtp.loading ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
                              </Button>
                            </div>
                          )}
                          {emailOtp.error && <p className="text-red-500 text-xs mt-1">{emailOtp.error}</p>}
                          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>

                        {/* Phone with OTP */}
                        <div>
                          <label className={labelClass}>Mobile Number *</label>
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                            <div className="relative min-w-0 flex-1">
                              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="10-digit number"
                                disabled={phoneOtp.verified}
                                maxLength={10}
                                className={`${inputClass('phone')} pl-11 ${phoneOtp.verified ? 'bg-green-50 border-green-300' : ''}`}
                              />
                              {phoneOtp.verified && (
                                <CheckCircle size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                              )}
                            </div>
                            {phoneOtp.verified ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPhoneOtp({ sent: false, verified: false, loading: false });
                                  setPhoneOtpInput('');
                                }}
                                className="h-12 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors sm:min-w-[6.5rem]"
                              >
                                <Pencil size={14} /> Change
                              </button>
                            ) : (
                              <Button
                                type="button"
                                onClick={() => sendOtp('PHONE')}
                                disabled={phoneOtp.loading || !formData.phone || phoneCooldown > 0}
                                className="h-12 w-full shrink-0 rounded-xl px-5 font-semibold shadow-md shadow-primary-500/20 sm:w-auto sm:min-w-[9rem]"
                              >
                                {phoneOtp.loading ? <Loader2 size={16} className="animate-spin" /> : phoneCooldown > 0 ? `Resend (${phoneCooldown}s)` : phoneOtp.sent ? 'Resend OTP' : 'Send OTP'}
                              </Button>
                            )}
                          </div>
                          {phoneOtp.sent && !phoneOtp.verified && (
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                type="text"
                                value={phoneOtpInput}
                                onChange={(e) => setPhoneOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                                className="h-12 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-center text-base tracking-[0.35em] outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
                                maxLength={6}
                              />
                              <Button
                                type="button"
                                onClick={() => verifyOtp('PHONE')}
                                disabled={phoneOtp.loading}
                                className="h-12 w-full shrink-0 rounded-xl px-6 font-semibold sm:w-auto sm:min-w-[6.5rem]"
                              >
                                {phoneOtp.loading ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
                              </Button>
                            </div>
                          )}
                          {phoneOtp.error && <p className="text-red-500 text-xs mt-1">{phoneOtp.error}</p>}
                          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>

                        {/* Password */}
                        <div>
                          <label className={labelClass}>Password *</label>
                          <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              name="password"
                              value={formData.password}
                              onChange={handleChange}
                              placeholder="Min 6 characters"
                              className={`${inputClass('password')} pl-11 pr-11`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                        </div>

                        <div>
                          <label className={labelClass}>Confirm Password *</label>
                          <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              name="confirmPassword"
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              placeholder="Re-enter password"
                              className={`${inputClass('confirmPassword')} pl-11 pr-11`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Tax Details */}
                  {currentStep === 2 && (
                    <div className="space-y-8">
                      <StepHeader
                        step={2}
                        title="Tax & identity"
                        description="GST, PAN, and KYC documents help us verify your business and pay you on time."
                      />

                      <div className="space-y-5">
                        {/* Non-GST Option */}
                        <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200/90 bg-white shadow-sm cursor-pointer hover:border-primary-200 hover:bg-primary-50/40 transition-all duration-200">
                          <input
                            type="checkbox"
                            name="sellsNonGstProducts"
                            checked={formData.sellsNonGstProducts}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-gray-300 text-primary-500"
                          />
                          <div>
                            <p className="font-medium text-gray-900">I only sell non-GST categories (like Books)</p>
                            <p className="text-sm text-gray-500">GST registration is not required for certain categories</p>
                          </div>
                        </label>

                        {/* GST Number */}
                        {!formData.sellsNonGstProducts && (
                          <div>
                            <label className={labelClass}>GST Number *</label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  name="gstNumber"
                                  value={formData.gstNumber}
                                  onChange={(e) => {
                                    handleChange(e);
                                    if (gstVerification.status !== 'idle') setGstVerification({ status: 'idle' });
                                  }}
                                  placeholder="15-digit GST number"
                                  maxLength={15}
                                  className={`${inputClass('gstNumber')} pl-11 uppercase`}
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={verifyGst}
                                disabled={formData.gstNumber.length !== 15 || gstVerification.status === 'loading'}
                              >
                                {gstVerification.status === 'loading' ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : gstVerification.status === 'verified' ? (
                                  <CheckCircle size={16} />
                                ) : (
                                  'Verify'
                                )}
                              </Button>
                            </div>
                            {errors.gstNumber && <p className="text-red-500 text-xs mt-1">{errors.gstNumber}</p>}
                            
                            {gstVerification.status === 'verified' && (
                              <div className="mt-3 p-4 rounded-xl bg-green-50 border border-green-200">
                                <div className="flex items-start gap-3">
                                  <CheckCircle size={20} className="text-green-600 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-green-800">GST Verified</p>
                                    <p className="text-sm text-green-700 mt-1">
                                      <strong>Trade Name:</strong> {gstVerification.data?.tradeName}
                                    </p>
                                    <p className="text-sm text-green-700">
                                      <strong>Legal Name:</strong> {gstVerification.data?.legalName}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {gstVerification.status === 'error' && (
                              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                                <XCircle size={14} /> {gstVerification.error}
                              </p>
                            )}
                          </div>
                        )}

                        {/* PAN Number */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>PAN Number *</label>
                            <input
                              type="text"
                              name="panNumber"
                              value={formData.panNumber}
                              onChange={handleChange}
                              placeholder="10-digit PAN"
                              maxLength={10}
                              className={`${inputClass('panNumber')} uppercase`}
                            />
                            {errors.panNumber && <p className="text-red-500 text-xs mt-1">{errors.panNumber}</p>}
                          </div>
                          <div>
                            <label className={labelClass}>Name as on PAN *</label>
                            <input
                              type="text"
                              name="panName"
                              value={formData.panName}
                              onChange={handleChange}
                              placeholder="Exact name on PAN card"
                              className={inputClass('panName')}
                            />
                            {errors.panName && <p className="text-red-500 text-xs mt-1">{errors.panName}</p>}
                          </div>
                        </div>

                        {/* KYC Document Upload */}
                        <div className="space-y-4 pt-2">
                          <div className="rounded-2xl border border-gray-100 bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-4">
                            <h3 className="text-base font-bold text-gray-900 font-display">KYC documents</h3>
                            <p className="text-sm text-gray-600 mt-1">Upload clear scans or photos (PDF or image). Files are encrypted in transit.</p>
                          </div>

                          {/* PAN Card Upload */}
                          <div>
                            <label className={labelClass}>PAN Card *</label>
                            <div className={`relative rounded-xl border-2 border-dashed transition-all ${
                              kycDocs.panCard.uploaded ? 'border-green-300 bg-green-50' :
                              kycDocs.panCard.file ? 'border-primary-300 bg-primary-50/30' :
                              errors.panCard ? 'border-red-300 bg-red-50' :
                              'border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/30'
                            } p-4`}>
                              {kycDocs.panCard.file ? (
                                <div className="flex items-center gap-4">
                                  {kycDocs.panCard.preview && !isPdfFile(kycDocs.panCard.file) ? (
                                    <img
                                      src={kycDocs.panCard.preview}
                                      alt="PAN Card"
                                      className="w-24 h-16 object-cover rounded-lg border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-24 h-16 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-100">
                                      <FileText className="w-10 h-10 text-red-600" aria-hidden />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{kycDocs.panCard.file?.name}</p>
                                    <p className="text-xs text-gray-500">{((kycDocs.panCard.file?.size || 0) / 1024).toFixed(0)} KB</p>
                                    {kycDocs.panCard.uploading && (
                                      <p className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-1">
                                        <Loader2 size={12} className="animate-spin" /> Uploading...
                                      </p>
                                    )}
                                    {kycDocs.panCard.uploaded && (
                                      <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                                        <CheckCircle size={12} /> Uploaded
                                      </p>
                                    )}
                                    {!kycDocs.panCard.uploaded && !kycDocs.panCard.uploading && (
                                      <p className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-1">
                                        <CheckCircle size={12} /> Ready &mdash; will upload on Continue
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (kycDocs.panCard.preview) URL.revokeObjectURL(kycDocs.panCard.preview);
                                      setKycDocs(prev => {
                                        const next = { ...prev, panCard: { uploading: false, uploaded: false } };
                                        kycDocsRef.current = next;
                                        return next;
                                      });
                                    }}
                                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 shrink-0"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center cursor-pointer py-3">
                                  <Upload size={24} className="text-gray-400 mb-2" />
                                  <p className="text-sm font-medium text-gray-700">Click to select PAN card</p>
                                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, or PDF (max 5MB)</p>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                                    className="hidden"
                                    onChange={(e) => handleKycFileSelect('panCard', e.target.files?.[0] || null)}
                                  />
                                </label>
                              )}
                            </div>
                            {errors.panCard && <p className="text-red-500 text-xs mt-1">{errors.panCard}</p>}
                          </div>

                          {/* Masked Aadhaar Upload */}
                          <div>
                            <label className={labelClass}>Masked Aadhaar Card *</label>
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-2">
                              <div className="flex gap-2">
                                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800">
                                  Upload a <strong>masked Aadhaar</strong> where the first 8 digits are hidden (XXXX-XXXX-1234). 
                                  Download from <a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noopener noreferrer" className="underline font-medium">myaadhaar.uidai.gov.in</a>
                                </p>
                              </div>
                            </div>
                            <div className={`relative rounded-xl border-2 border-dashed transition-all ${
                              kycDocs.maskedAadhaar.uploaded ? 'border-green-300 bg-green-50' :
                              kycDocs.maskedAadhaar.file ? 'border-primary-300 bg-primary-50/30' :
                              errors.maskedAadhaar ? 'border-red-300 bg-red-50' :
                              'border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/30'
                            } p-4`}>
                              {kycDocs.maskedAadhaar.file ? (
                                <div className="flex items-center gap-4">
                                  {kycDocs.maskedAadhaar.preview && !isPdfFile(kycDocs.maskedAadhaar.file) ? (
                                    <img
                                      src={kycDocs.maskedAadhaar.preview}
                                      alt="Masked Aadhaar"
                                      className="w-24 h-16 object-cover rounded-lg border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-24 h-16 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-100">
                                      <FileText className="w-10 h-10 text-amber-700" aria-hidden />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{kycDocs.maskedAadhaar.file?.name}</p>
                                    <p className="text-xs text-gray-500">{((kycDocs.maskedAadhaar.file?.size || 0) / 1024).toFixed(0)} KB</p>
                                    {kycDocs.maskedAadhaar.uploading && (
                                      <p className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-1">
                                        <Loader2 size={12} className="animate-spin" /> Uploading...
                                      </p>
                                    )}
                                    {kycDocs.maskedAadhaar.uploaded && (
                                      <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                                        <CheckCircle size={12} /> Uploaded
                                      </p>
                                    )}
                                    {!kycDocs.maskedAadhaar.uploaded && !kycDocs.maskedAadhaar.uploading && (
                                      <p className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-1">
                                        <CheckCircle size={12} /> Ready &mdash; will upload on Continue
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (kycDocs.maskedAadhaar.preview) URL.revokeObjectURL(kycDocs.maskedAadhaar.preview);
                                      setKycDocs(prev => {
                                        const next = { ...prev, maskedAadhaar: { uploading: false, uploaded: false } };
                                        kycDocsRef.current = next;
                                        return next;
                                      });
                                    }}
                                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 shrink-0"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center cursor-pointer py-3">
                                  <Upload size={24} className="text-gray-400 mb-2" />
                                  <p className="text-sm font-medium text-gray-700">Click to select masked Aadhaar</p>
                                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, or PDF (max 5MB)</p>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                                    className="hidden"
                                    onChange={(e) => handleKycFileSelect('maskedAadhaar', e.target.files?.[0] || null)}
                                  />
                                </label>
                              )}
                            </div>
                            {errors.maskedAadhaar && <p className="text-red-500 text-xs mt-1">{errors.maskedAadhaar}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Store Details */}
                  {currentStep === 3 && (
                    <div className="space-y-8">
                      <StepHeader
                        step={3}
                        title="Your storefront"
                        description="Choose a name and category customers will see when they discover your products."
                      />

                      <div className="space-y-5">
                        <div>
                          <label className={labelClass}>Store Name *</label>
                          <div className="relative">
                            <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              name="storeName"
                              value={formData.storeName}
                              onChange={handleChange}
                              placeholder="Your store name (visible to customers)"
                              className={`${inputClass('storeName')} pl-11`}
                            />
                          </div>
                          {errors.storeName && <p className="text-red-500 text-xs mt-1">{errors.storeName}</p>}
                        </div>

                        <div>
                          <label className={labelClass}>Store Description</label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Tell customers about your store (optional)"
                            rows={3}
                            className={inputClass('description')}
                          />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="min-w-0">
                            <label className={labelClass}>Business Type *</label>
                            <select
                              name="businessType"
                              value={formData.businessType}
                              onChange={handleChange}
                              className={selectClass('businessType')}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                              }}
                            >
                              <option value="">Select type</option>
                              {businessTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                            {errors.businessType && <p className="text-red-500 text-xs mt-1">{errors.businessType}</p>}
                          </div>
                          <div className="min-w-0">
                            <label className={labelClass}>Primary Category *</label>
                            <select
                              name="businessCategory"
                              value={formData.businessCategory}
                              onChange={handleChange}
                              className={selectClass('businessCategory')}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                              }}
                            >
                              <option value="">Select category</option>
                              {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                              ))}
                            </select>
                            {errors.businessCategory && <p className="text-red-500 text-xs mt-1">{errors.businessCategory}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Address */}
                  {currentStep === 4 && (
                    <div className="space-y-8">
                      <StepHeader
                        step={4}
                        title="Pickup address"
                        description="This is where our logistics partner collects shipments—use your warehouse or primary dispatch location."
                      />

                      <div className="space-y-5">
                        <div className="grid sm:grid-cols-3 gap-4">
                          <div>
                            <label className={labelClass}>Pincode *</label>
                            <input
                              type="text"
                              name="pincode"
                              value={formData.pincode}
                              onChange={handleChange}
                              placeholder="6-digit pincode"
                              maxLength={6}
                              className={inputClass('pincode')}
                            />
                            {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
                          </div>
                          <div>
                            <label className={labelClass}>City *</label>
                            <input
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleChange}
                              placeholder="City"
                              className={inputClass('city')}
                            />
                            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                          </div>
                          <div className="min-w-0">
                            <label className={labelClass}>State *</label>
                            <select
                              name="state"
                              value={formData.state}
                              onChange={handleChange}
                              className={selectClass('state')}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                              }}
                            >
                              <option value="">Select state</option>
                              {indianStates.map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                            {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Full Address *</label>
                          <div className="relative">
                            <MapPin size={18} className="absolute left-4 top-4 text-gray-400" />
                            <textarea
                              name="address"
                              value={formData.address}
                              onChange={handleChange}
                              placeholder="Building name, floor, street, area, landmark"
                              rows={3}
                              className={`${inputClass('address')} pl-11`}
                            />
                          </div>
                          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Shipping */}
                  {currentStep === 5 && (
                    <div className="space-y-8">
                      <StepHeader
                        step={5}
                        title="Shipping & delivery"
                        description="Pick how you fulfill orders and whether you offer free delivery to buyers."
                      />

                      <div className="space-y-5">
                        <div className="space-y-3">
                          <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer shadow-sm transition-all duration-200 ${
                            formData.shippingMethod === 'easy_ship'
                              ? 'border-primary-500 bg-primary-50/80 ring-2 ring-primary-500/20'
                              : 'border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-md'
                          }`}>
                            <input
                              type="radio"
                              name="shippingMethod"
                              value="easy_ship"
                              checked={formData.shippingMethod === 'easy_ship'}
                              onChange={handleChange}
                              className="mt-1"
                            />
                            <div>
                              <p className="font-medium text-gray-900 flex items-center gap-2">
                                You store, Xelnova ships (Easy Ship)
                                <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">Recommended</span>
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Store and pack orders at your location. We pick them and deliver to customers.
                              </p>
                            </div>
                          </label>

                          <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer shadow-sm transition-all duration-200 ${
                            formData.shippingMethod === 'self_ship'
                              ? 'border-primary-500 bg-primary-50/80 ring-2 ring-primary-500/20'
                              : 'border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-md'
                          }`}>
                            <input
                              type="radio"
                              name="shippingMethod"
                              value="self_ship"
                              checked={formData.shippingMethod === 'self_ship'}
                              onChange={handleChange}
                              className="mt-1"
                            />
                            <div>
                              <p className="font-medium text-gray-900">You store, You ship (Self Ship)</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Handle storage and delivery yourself or through your own courier partners.
                              </p>
                            </div>
                          </label>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              name="offerFreeDelivery"
                              checked={formData.offerFreeDelivery}
                              onChange={handleChange}
                              className="w-5 h-5 rounded border-gray-300 text-primary-500"
                            />
                            <div>
                              <p className="font-medium text-gray-900">Offer free delivery to customers</p>
                              <p className="text-sm text-gray-500">Recommended for better conversion rates</p>
                            </div>
                          </label>
                        </div>

                        {!formData.offerFreeDelivery && (
                          <div className="grid sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                            <div>
                              <label className={labelClass}>1-3 Days Delivery (₹) *</label>
                              <input
                                type="number"
                                name="deliveryCharge1to3Days"
                                value={formData.deliveryCharge1to3Days}
                                onChange={handleChange}
                                placeholder="e.g., 40"
                                className={inputClass('deliveryCharge1to3Days')}
                              />
                              {errors.deliveryCharge1to3Days && <p className="text-red-500 text-xs mt-1">{errors.deliveryCharge1to3Days}</p>}
                            </div>
                            <div>
                              <label className={labelClass}>3+ Days Delivery (₹) *</label>
                              <input
                                type="number"
                                name="deliveryCharge3PlusDays"
                                value={formData.deliveryCharge3PlusDays}
                                onChange={handleChange}
                                placeholder="e.g., 60"
                                className={inputClass('deliveryCharge3PlusDays')}
                              />
                              {errors.deliveryCharge3PlusDays && <p className="text-red-500 text-xs mt-1">{errors.deliveryCharge3PlusDays}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 6: Bank Details */}
                  {currentStep === 6 && (
                    <div className="space-y-8">
                      <StepHeader
                        step={6}
                        title="Bank account"
                        description="Payouts are sent to this account after each settlement cycle. Verify IFSC and account for faster approval."
                      />

                      <div className="space-y-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Account Number *</label>
                            <div className="relative">
                              <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                name="accountNumber"
                                value={formData.accountNumber}
                                onChange={(e) => {
                                  handleChange(e);
                                  if (bankVerification.status !== 'idle') setBankVerification({ status: 'idle' });
                                }}
                                placeholder="Bank account number"
                                disabled={bankVerification.status === 'verified'}
                                className={`${inputClass('accountNumber')} pl-11 ${bankVerification.status === 'verified' ? 'bg-green-50 border-green-300' : ''}`}
                              />
                            </div>
                            {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
                          </div>

                          <div>
                            <label className={labelClass}>IFSC Code *</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                name="ifscCode"
                                value={formData.ifscCode}
                                onChange={(e) => {
                                  handleChange(e);
                                  if (ifscVerification.status !== 'idle') setIfscVerification({ status: 'idle' });
                                  if (bankVerification.status !== 'idle') setBankVerification({ status: 'idle' });
                                }}
                                placeholder="11-digit IFSC"
                                maxLength={11}
                                disabled={bankVerification.status === 'verified'}
                                className={`${inputClass('ifscCode')} uppercase flex-1 ${bankVerification.status === 'verified' ? 'bg-green-50 border-green-300' : ''}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={verifyIfsc}
                                disabled={formData.ifscCode.length !== 11 || ifscVerification.status === 'loading' || bankVerification.status === 'verified'}
                              >
                                {ifscVerification.status === 'loading' ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : ifscVerification.status === 'verified' ? (
                                  <CheckCircle size={16} className="text-green-500" />
                                ) : (
                                  'Verify'
                                )}
                              </Button>
                            </div>
                            {errors.ifscCode && <p className="text-red-500 text-xs mt-1">{errors.ifscCode}</p>}
                          </div>
                        </div>

                        {ifscVerification.status === 'verified' && bankVerification.status !== 'verified' && (
                          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                            <div className="flex items-start gap-3">
                              <CheckCircle size={20} className="text-blue-600 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-blue-800">
                                  {ifscVerification.data?.BANK} - {ifscVerification.data?.BRANCH}
                                </p>
                                <p className="text-sm text-blue-600 mt-1">IFSC verified. Now verify your bank account below.</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {ifscVerification.status === 'error' && (
                          <p className="text-red-500 text-sm flex items-center gap-1">
                            <XCircle size={14} /> {ifscVerification.error}
                          </p>
                        )}

                        {ifscVerification.status === 'verified' && bankVerification.status !== 'verified' && (
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-start gap-3">
                                <Wallet size={20} className="text-amber-600 mt-0.5" />
                                <div>
                                  <p className="font-medium text-amber-800">Verify Bank Account (Penny Drop)</p>
                                  <p className="text-sm text-amber-700 mt-1">
                                    We&apos;ll deposit ₹1 to verify your account number and fetch the registered name.
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                onClick={verifyBankAccount}
                                disabled={
                                  bankVerification.status === 'loading' ||
                                  !formData.accountNumber ||
                                  !/^[0-9]{9,18}$/.test(formData.accountNumber)
                                }
                                className="shrink-0 ml-4"
                              >
                                {bankVerification.status === 'loading' ? (
                                  <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                                ) : (
                                  'Verify Account'
                                )}
                              </Button>
                            </div>
                            {bankVerification.status === 'error' && (
                              <p className="text-red-500 text-sm mt-3 flex items-center gap-1">
                                <XCircle size={14} /> {bankVerification.error}
                              </p>
                            )}
                          </div>
                        )}

                        {bankVerification.status === 'verified' && (
                          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                            <div className="flex items-start gap-3">
                              <CheckCircle size={20} className="text-green-600 mt-0.5" />
                              <div>
                                <p className="font-medium text-green-800">Bank Account Verified (₹1 credited)</p>
                                <p className="text-sm text-green-700 mt-1">
                                  <strong>Account Holder:</strong> {bankVerification.data?.nameAtBank}
                                </p>
                                <p className="text-sm text-green-700">
                                  <strong>Bank:</strong> {bankVerification.data?.bankName || ifscVerification.data?.BANK}
                                  {(bankVerification.data?.branch || ifscVerification.data?.BRANCH) && 
                                    ` — ${bankVerification.data?.branch || ifscVerification.data?.BRANCH}`}
                                </p>
                                {bankVerification.data?.city && (
                                  <p className="text-sm text-green-700">
                                    <strong>City:</strong> {bankVerification.data.city}
                                  </p>
                                )}
                                {bankVerification.data?.utr && (
                                  <p className="text-xs text-green-600 mt-1">UTR: {bankVerification.data.utr}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className={labelClass}>Account Holder Name *</label>
                          <input
                            type="text"
                            name="accountHolderName"
                            value={formData.accountHolderName}
                            onChange={handleChange}
                            placeholder={bankVerification.status === 'verified' ? 'Auto-filled from bank verification' : 'Name as per bank records'}
                            className={`${inputClass('accountHolderName')} ${bankVerification.status === 'verified' ? 'bg-green-50 border-green-300' : ''}`}
                          />
                          {bankVerification.status === 'verified' && formData.accountHolderName !== bankVerification.data?.nameAtBank && (
                            <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
                              <AlertCircle size={12} /> Name differs from bank records: {bankVerification.data?.nameAtBank}
                            </p>
                          )}
                          {errors.accountHolderName && <p className="text-red-500 text-xs mt-1">{errors.accountHolderName}</p>}
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              name="agreeTerms"
                              checked={formData.agreeTerms}
                              onChange={handleChange}
                              className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-500"
                            />
                            <span className="text-sm text-gray-600">
                              I agree to the{' '}
                              <a href="#" className="text-primary-500 hover:underline">Terms of Service</a>,{' '}
                              <a href="#" className="text-primary-500 hover:underline">Privacy Policy</a>, and{' '}
                              <a href="#" className="text-primary-500 hover:underline">Seller Agreement</a>.
                              I confirm that all information provided is accurate.
                            </span>
                          </label>
                          {errors.agreeTerms && <p className="text-red-500 text-xs mt-1">{errors.agreeTerms}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                    </motion.div>
                  </AnimatePresence>

                  {/* Error Message */}
                  {errors.submit && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200/80 rounded-xl shadow-sm">
                      <p className="text-red-600 text-sm flex items-center gap-2 font-medium">
                        <XCircle size={16} className="shrink-0" /> {errors.submit}
                      </p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div
                  className={`relative z-0 px-6 sm:px-8 py-5 bg-gradient-to-r from-slate-50/95 via-white to-slate-50/95 border-t border-gray-200/80 flex flex-col-reverse gap-3 sm:flex-row sm:items-center ${
                    currentStep === 1 ? 'sm:justify-end' : 'sm:justify-between'
                  }`}
                >
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      disabled={loading}
                      className="w-full sm:w-auto min-h-[48px] border-gray-300 hover:bg-gray-50 font-semibold"
                    >
                      <ArrowLeft size={18} /> Back
                    </Button>
                  ) : null}

                  {currentStep < 6 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={loading}
                      className="w-full sm:w-auto min-h-[48px] shadow-lg shadow-primary-500/20 font-semibold px-8"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : 'Continue'}
                      <ArrowRight size={18} />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto min-h-[48px] shadow-lg shadow-primary-500/20 font-semibold px-8"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : 'Complete registration'}
                      <ArrowRight size={18} />
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
