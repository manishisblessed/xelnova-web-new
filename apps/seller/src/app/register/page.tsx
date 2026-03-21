'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  RefreshCw,
} from 'lucide-react';
import { Button } from '@xelnova/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
  sessionId?: string;
  puzzle?: any;
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
  const [captcha, setCaptcha] = useState<CaptchaState>({ loading: false, solved: false });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [gstVerification, setGstVerification] = useState<VerificationState>({ status: 'idle' });
  const [ifscVerification, setIfscVerification] = useState<VerificationState>({ status: 'idle' });

  // Generate Captcha
  const generateCaptcha = useCallback(async () => {
    setCaptcha({ loading: true, solved: false });
    setCaptchaAnswer('');
    try {
      const res = await fetch(`${API_BASE}/seller-onboarding/captcha/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ROCK_COUNT' }),
      });
      const data = await res.json();
      if (data.success) {
        setCaptcha({
          loading: false,
          solved: false,
          sessionId: data.data.sessionId,
          puzzle: data.data.puzzle,
        });
      } else {
        setCaptcha({ loading: false, solved: false, error: 'Failed to load captcha' });
      }
    } catch {
      setCaptcha({ loading: false, solved: false, error: 'Failed to load captcha' });
    }
  }, []);

  useEffect(() => {
    if (currentStep === 1 && !captcha.sessionId && !captcha.loading) {
      generateCaptcha();
    }
  }, [currentStep, captcha.sessionId, captcha.loading, generateCaptcha]);

  // Verify Captcha
  const verifyCaptcha = async () => {
    if (!captcha.sessionId || !captchaAnswer) return;
    
    setCaptcha(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      const res = await fetch(`${API_BASE}/seller-onboarding/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: captcha.sessionId, answer: captchaAnswer }),
      });
      const data = await res.json();
      if (data.success) {
        setCaptcha(prev => ({ ...prev, loading: false, solved: true, token: data.data.captchaToken }));
      } else {
        setCaptcha(prev => ({ ...prev, loading: false, error: data.message || 'Incorrect answer' }));
        setCaptchaAnswer('');
      }
    } catch {
      setCaptcha(prev => ({ ...prev, loading: false, error: 'Verification failed' }));
    }
  };

  // Send OTP
  const sendOtp = async (type: 'EMAIL' | 'PHONE') => {
    const identifier = type === 'EMAIL' ? formData.email : formData.phone;
    const setOtpState = type === 'EMAIL' ? setEmailOtp : setPhoneOtp;
    
    if (!identifier) {
      setErrors(prev => ({ ...prev, [type.toLowerCase()]: `${type === 'EMAIL' ? 'Email' : 'Phone'} is required` }));
      return;
    }

    setOtpState({ sent: false, verified: false, loading: true });
    try {
      const res = await fetch(`${API_BASE}/seller-onboarding/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, type, purpose: 'REGISTRATION' }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpState({ sent: true, verified: false, loading: false, expiresIn: data.data.expiresIn });
        if (data.data.devOtp) {
          alert(`[Dev Mode] Your OTP is: ${data.data.devOtp}`);
        }
      } else {
        setOtpState({ sent: false, verified: false, loading: false, error: data.message });
      }
    } catch {
      setOtpState({ sent: false, verified: false, loading: false, error: 'Failed to send OTP' });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
          setCurrentStep(2);
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
      // Update bank details
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

      // Submit for review
      const submitRes = await fetch(`${API_BASE}/seller-onboarding/submit/${sellerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const submitData = await submitRes.json();

      if (submitData.success) {
        router.push('/login?registered=true');
      } else {
        setErrors({ submit: submitData.message || 'Submission failed' });
      }
    } catch {
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl border ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
    } focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-400/20 outline-none transition-all text-gray-900 placeholder:text-gray-400`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Store size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 font-display">
                Xelnova <span className="text-primary-500">Seller</span>
              </span>
            </Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-primary-500">
              Already registered? <span className="font-medium text-primary-500">Sign in</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Progress */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-6">Registration Progress</h3>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        currentStep > step.id
                          ? 'bg-primary-500 text-white'
                          : currentStep === step.id
                          ? 'bg-primary-100 text-primary-600 ring-2 ring-primary-500'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {currentStep > step.id ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <span className="text-sm font-medium">{step.id}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-4">Why Sell on Xelnova?</h3>
                <div className="space-y-3">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <benefit.icon size={16} />
                      </div>
                      <span>{benefit.text}</span>
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
              <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100">
                <span className="text-sm text-gray-600">Step {currentStep} of {steps.length}</span>
                <div className="flex gap-1">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`w-8 h-1.5 rounded-full ${
                        currentStep >= step.id ? 'bg-primary-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <form onSubmit={handleSubmit}>
                <div className="p-6 sm:p-8">
                  {/* Step 1: Account */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
                        <p className="text-gray-600 mt-1">Verify your email and phone to get started</p>
                      </div>

                      {/* Puzzle CAPTCHA */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <Shield size={18} className="text-primary-500" />
                          Security Verification
                        </h3>
                        
                        {captcha.solved ? (
                          <div className="flex items-center gap-3 text-green-600">
                            <CheckCircle size={24} />
                            <span className="font-medium">Puzzle completed successfully!</span>
                          </div>
                        ) : captcha.puzzle ? (
                          <div className="space-y-4">
                            <p className="text-base font-medium text-gray-800">{captcha.puzzle.instruction}</p>
                            {captcha.puzzle.display && (
                              <div className="text-2xl font-bold text-gray-900 bg-white rounded-xl p-4 border border-gray-200 text-center tracking-wider select-none">
                                {captcha.puzzle.display}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-3">
                              {captcha.puzzle.options?.map((opt: number, idx: number) => (
                                <button
                                  key={`${opt}-${idx}`}
                                  type="button"
                                  onClick={() => setCaptchaAnswer(opt.toString())}
                                  className={`min-w-[56px] h-14 px-4 rounded-xl border-2 text-lg font-bold transition-all ${
                                    captchaAnswer === opt.toString()
                                      ? 'border-primary-500 bg-primary-50 text-primary-600 shadow-md'
                                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={verifyCaptcha}
                                disabled={!captchaAnswer || captcha.loading}
                                size="sm"
                              >
                                {captcha.loading ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={generateCaptcha}
                              >
                                <RefreshCw size={16} /> New Puzzle
                              </Button>
                            </div>
                            {captcha.error && (
                              <p className="text-red-500 text-sm flex items-center gap-1">
                                <XCircle size={14} /> {captcha.error}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 size={16} className="animate-spin" />
                            Loading puzzle...
                          </div>
                        )}
                        {errors.captcha && <p className="text-red-500 text-sm mt-2">{errors.captcha}</p>}
                      </div>

                      {/* Personal Info */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
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
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
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
                            {!emailOtp.verified && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => sendOtp('EMAIL')}
                                disabled={emailOtp.loading || !formData.email}
                                className="shrink-0"
                              >
                                {emailOtp.loading ? <Loader2 size={16} className="animate-spin" /> : emailOtp.sent ? 'Resend' : 'Send OTP'}
                              </Button>
                            )}
                          </div>
                          {emailOtp.sent && !emailOtp.verified && (
                            <div className="mt-2 flex gap-2">
                              <input
                                type="text"
                                value={emailOtpInput}
                                onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-center tracking-widest"
                                maxLength={6}
                              />
                              <Button type="button" size="sm" onClick={() => verifyOtp('EMAIL')} disabled={emailOtp.loading}>
                                {emailOtp.loading ? <Loader2 size={14} className="animate-spin" /> : 'Verify'}
                              </Button>
                            </div>
                          )}
                          {emailOtp.error && <p className="text-red-500 text-xs mt-1">{emailOtp.error}</p>}
                          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>

                        {/* Phone with OTP */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number *</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
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
                            {!phoneOtp.verified && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => sendOtp('PHONE')}
                                disabled={phoneOtp.loading || !formData.phone}
                                className="shrink-0"
                              >
                                {phoneOtp.loading ? <Loader2 size={16} className="animate-spin" /> : phoneOtp.sent ? 'Resend' : 'Send OTP'}
                              </Button>
                            )}
                          </div>
                          {phoneOtp.sent && !phoneOtp.verified && (
                            <div className="mt-2 flex gap-2">
                              <input
                                type="text"
                                value={phoneOtpInput}
                                onChange={(e) => setPhoneOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-center tracking-widest"
                                maxLength={6}
                              />
                              <Button type="button" size="sm" onClick={() => verifyOtp('PHONE')} disabled={phoneOtp.loading}>
                                {phoneOtp.loading ? <Loader2 size={14} className="animate-spin" /> : 'Verify'}
                              </Button>
                            </div>
                          )}
                          {phoneOtp.error && <p className="text-red-500 text-xs mt-1">{phoneOtp.error}</p>}
                          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>

                        {/* Password */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
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
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                          <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              name="confirmPassword"
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              placeholder="Re-enter password"
                              className={`${inputClass('confirmPassword')} pl-11`}
                            />
                          </div>
                          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Tax Details */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Tax Details</h2>
                        <p className="text-gray-600 mt-1">Verify your GST and PAN for compliance</p>
                      </div>

                      <div className="space-y-4">
                        {/* Non-GST Option */}
                        <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">GST Number *</label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">PAN Number *</label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name as on PAN *</label>
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

                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                          <div className="flex gap-3">
                            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                              <p className="font-medium">Document Upload Required</p>
                              <p className="mt-1">You'll need to upload PAN card copy after registration for verification.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Store Details */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Store Details</h2>
                        <p className="text-gray-600 mt-1">Set up your store identity</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Name *</label>
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
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Description</label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Tell customers about your store (optional)"
                            rows={3}
                            className={inputClass('description')}
                          />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Type *</label>
                            <select
                              name="businessType"
                              value={formData.businessType}
                              onChange={handleChange}
                              className={inputClass('businessType')}
                            >
                              <option value="">Select type</option>
                              {businessTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                            {errors.businessType && <p className="text-red-500 text-xs mt-1">{errors.businessType}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Category *</label>
                            <select
                              name="businessCategory"
                              value={formData.businessCategory}
                              onChange={handleChange}
                              className={inputClass('businessCategory')}
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
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Pickup Address</h2>
                        <p className="text-gray-600 mt-1">Where orders will be picked up from</p>
                      </div>

                      <div className="space-y-4">
                        <div className="grid sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pincode *</label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
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
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">State *</label>
                            <select
                              name="state"
                              value={formData.state}
                              onChange={handleChange}
                              className={inputClass('state')}
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
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Address *</label>
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
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Shipping Preferences</h2>
                        <p className="text-gray-600 mt-1">Choose how you want to fulfill orders</p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-3">
                          <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.shippingMethod === 'easy_ship' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
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

                          <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.shippingMethod === 'self_ship' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
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
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">1-3 Days Delivery (₹) *</label>
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
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">3+ Days Delivery (₹) *</label>
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
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Bank Account Details</h2>
                        <p className="text-gray-600 mt-1">For receiving your sales payments</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Holder Name *</label>
                          <input
                            type="text"
                            name="accountHolderName"
                            value={formData.accountHolderName}
                            onChange={handleChange}
                            placeholder="Name as per bank records (must match GST/PAN)"
                            className={inputClass('accountHolderName')}
                          />
                          {errors.accountHolderName && <p className="text-red-500 text-xs mt-1">{errors.accountHolderName}</p>}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number *</label>
                            <div className="relative">
                              <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                name="accountNumber"
                                value={formData.accountNumber}
                                onChange={handleChange}
                                placeholder="Bank account number"
                                className={`${inputClass('accountNumber')} pl-11`}
                              />
                            </div>
                            {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">IFSC Code *</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                name="ifscCode"
                                value={formData.ifscCode}
                                onChange={(e) => {
                                  handleChange(e);
                                  if (ifscVerification.status !== 'idle') setIfscVerification({ status: 'idle' });
                                }}
                                placeholder="11-digit IFSC"
                                maxLength={11}
                                className={`${inputClass('ifscCode')} uppercase flex-1`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={verifyIfsc}
                                disabled={formData.ifscCode.length !== 11 || ifscVerification.status === 'loading'}
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

                        {ifscVerification.status === 'verified' && (
                          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                            <div className="flex items-start gap-3">
                              <CheckCircle size={20} className="text-green-600 mt-0.5" />
                              <div>
                                <p className="font-medium text-green-800">Bank Verified</p>
                                <p className="text-sm text-green-700 mt-1">
                                  <strong>{ifscVerification.data?.BANK}</strong> - {ifscVerification.data?.BRANCH}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {ifscVerification.status === 'error' && (
                          <p className="text-red-500 text-sm flex items-center gap-1">
                            <XCircle size={14} /> {ifscVerification.error}
                          </p>
                        )}

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

                  {/* Error Message */}
                  {errors.submit && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-600 text-sm flex items-center gap-2">
                        <XCircle size={16} /> {errors.submit}
                      </p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      disabled={loading}
                    >
                      <ArrowLeft size={18} /> Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 6 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={loading}
                      className="shadow-lg shadow-primary-500/25"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : 'Continue'}
                      <ArrowRight size={18} />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={loading}
                      className="shadow-lg shadow-primary-500/25"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : 'Complete Registration'}
                      <ArrowRight size={18} />
                    </Button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
