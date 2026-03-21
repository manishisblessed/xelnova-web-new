'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  TrendingUp,
  Package,
  Truck,
  Shield,
  Users,
  BarChart3,
  Wallet,
  Clock,
  CheckCircle2,
  Star,
  ChevronRight,
  Play,
  Zap,
  Globe,
  Headphones,
} from 'lucide-react';
import { Button } from '@xelnova/ui';

const stats = [
  { value: '50L+', label: 'Active Customers', icon: Users },
  { value: '99.5%', label: 'Pincode Coverage', icon: Globe },
  { value: '₹2Cr+', label: 'Daily Transactions', icon: TrendingUp },
  { value: '10K+', label: 'Sellers Trust Us', icon: Shield },
];

const benefits = [
  {
    icon: TrendingUp,
    title: 'Grow Your Business 10x',
    description: 'Access millions of customers actively looking to buy. Our sellers see 3x growth in their first year.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Wallet,
    title: 'Low Commission Rates',
    description: 'Keep more of what you earn with our competitive commission structure starting at just 5%.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    icon: Truck,
    title: 'Hassle-Free Logistics',
    description: 'We handle pickup, packaging, and delivery. You focus on your products, we handle the rest.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Clock,
    title: 'Quick Payments',
    description: 'Get paid within 7 days of delivery. No waiting, no hassle. Your money, on time.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: BarChart3,
    title: 'Powerful Analytics',
    description: 'Real-time insights on sales, inventory, and customer behavior to optimize your business.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Headphones,
    title: '24/7 Seller Support',
    description: 'Dedicated account managers and round-the-clock support to help you succeed.',
    color: 'from-pink-500 to-rose-500',
  },
];

const steps = [
  {
    step: '01',
    title: 'Register Your Business',
    description: 'Sign up with your GSTIN, PAN, and bank details. It takes less than 10 minutes.',
  },
  {
    step: '02',
    title: 'List Your Products',
    description: 'Upload your catalog with our easy-to-use tools. Add photos, descriptions, and pricing.',
  },
  {
    step: '03',
    title: 'Receive Orders',
    description: 'Customers discover your products. You get notified instantly when orders come in.',
  },
  {
    step: '04',
    title: 'Ship & Earn',
    description: 'We pick up from your location. You earn money directly to your bank account.',
  },
];

const testimonials = [
  {
    name: 'Rajesh Kumar',
    business: 'RK Electronics',
    location: 'Delhi',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    quote: 'Started with 50 products, now selling 500+ items. Xelnova transformed my small shop into a nationwide business.',
    growth: '400% growth in 1 year',
  },
  {
    name: 'Priya Sharma',
    business: 'Priya Fashion House',
    location: 'Jaipur',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    quote: 'The logistics support is incredible. I focus on designing, Xelnova handles everything else.',
    growth: '₹15L monthly revenue',
  },
  {
    name: 'Mohammed Ali',
    business: 'Ali Handicrafts',
    location: 'Moradabad',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    quote: 'My handcrafted items now reach customers across India. The platform is very easy to use.',
    growth: '5000+ orders delivered',
  },
];

const categories = [
  'Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports', 'Books', 'Toys', 'Grocery'
];

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function SellerLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">X</span>
              </div>
              <span className="text-xl font-bold text-gray-900 font-display">Xelnova <span className="text-primary-500">Seller</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#benefits" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">Benefits</a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">How it Works</a>
              <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">Success Stories</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-700 hover:text-primary-500">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="shadow-lg shadow-primary-500/25">
                  Start Selling <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
                <Zap size={16} />
                <span>Zero registration fee for new sellers</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 font-display leading-tight">
                Sell to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-600">Millions</span> of Customers Across India
              </h1>
              
              <p className="mt-6 text-lg md:text-xl text-gray-600 leading-relaxed">
                Join 10,000+ sellers who trust Xelnova to grow their business. Low fees, fast payments, and nationwide reach — all in one platform.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto shadow-xl shadow-primary-500/30 text-base px-8">
                    Start Selling Today <ArrowRight size={20} />
                  </Button>
                </Link>
                <button className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:border-primary-300 hover:text-primary-600 transition-all">
                  <Play size={20} className="text-primary-500" />
                  Watch How It Works
                </button>
              </div>
              
              <div className="mt-10 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                      <img 
                        src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">Rated 4.8/5 by 10,000+ sellers</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <TrendingUp size={40} className="text-white" />
                </div>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-400 text-sm">Your potential monthly earnings</p>
                    <p className="text-4xl font-bold text-white mt-1">₹2,50,000+</p>
                  </div>
                  
                  <div className="h-40 flex items-end gap-2">
                    {[40, 55, 45, 70, 60, 85, 75, 95, 80, 100, 90, 110].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
                        className="flex-1 bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-sm"
                      />
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                    <div>
                      <p className="text-2xl font-bold text-white">156</p>
                      <p className="text-xs text-gray-400">Orders Today</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary-400">+23%</p>
                      <p className="text-xs text-gray-400">Growth</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">4.9</p>
                      <p className="text-xs text-gray-400">Rating</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute -left-8 top-1/4 bg-white rounded-2xl p-4 shadow-xl border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Payment Received</p>
                    <p className="text-xs text-gray-500">₹45,230 credited</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="absolute -right-4 bottom-1/4 bg-white rounded-2xl p-4 shadow-xl border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Package size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">New Order!</p>
                    <p className="text-xs text-gray-500">Order #XN78234</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-4">
                  <stat.icon size={28} className="text-primary-400" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                <p className="text-gray-400 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories Banner */}
      <section className="py-12 bg-gradient-to-r from-primary-500 to-primary-600 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...categories, ...categories, ...categories].map((cat, i) => (
            <span key={i} className="mx-8 text-white/90 text-lg font-medium flex items-center gap-2">
              <CheckCircle2 size={18} className="text-white/70" />
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 md:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
              Why Sell on Xelnova?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-display">
              Everything You Need to Succeed
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              We provide all the tools, support, and reach you need to build a thriving online business.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-200 transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.color} mb-6 group-hover:scale-110 transition-transform`}>
                  <benefit.icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
              Simple Process
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-display">
              Start Selling in 4 Easy Steps
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From registration to your first sale — we've made it incredibly simple.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200 -translate-y-1/2" />
            
            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="absolute -top-4 left-8 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {step.step}
                  </div>
                  <div className="pt-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <Link href="/register">
              <Button size="lg" className="shadow-xl shadow-primary-500/30">
                Get Started Now <ArrowRight size={20} />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-500/20 text-primary-400 text-sm font-medium mb-4">
              Success Stories
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white font-display">
              Sellers Who Transformed Their Business
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Real stories from real sellers who found success on Xelnova.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-primary-500/30 transition-colors"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 leading-relaxed mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-gray-400">{testimonial.business}, {testimonial.location}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-primary-400 font-medium">{testimonial.growth}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-4">
              Transparent Pricing
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-display">
              Simple, Fair Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              No hidden fees. No surprises. Just straightforward pricing that helps you grow.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-1">
              <div className="bg-white rounded-[22px] p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
                      <Zap size={14} />
                      Most Popular
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Commission-Based</h3>
                    <p className="text-gray-600 mb-6">Pay only when you sell. No monthly fees, no setup costs.</p>
                    
                    <div className="space-y-3">
                      {[
                        'Starting at 5% commission',
                        'Free product listings',
                        'Free logistics pickup',
                        'Weekly payouts',
                        'Seller dashboard access',
                        '24/7 support',
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <CheckCircle2 size={20} className="text-primary-500 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl p-8 text-center">
                    <p className="text-gray-600 mb-2">Commission starts at</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-gray-900">5%</span>
                      <span className="text-gray-500">per sale</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Varies by category</p>
                    
                    <Link href="/register" className="block mt-8">
                      <Button size="lg" fullWidth className="shadow-lg shadow-primary-500/25">
                        Start Selling Free <ArrowRight size={18} />
                      </Button>
                    </Link>
                    <p className="text-xs text-gray-500 mt-4">No credit card required</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTItNC0yLTItNCAyLTQgMi00IDQtMiA0LTIgMi00IDItNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white font-display mb-6">
              Ready to Start Your Selling Journey?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Join thousands of successful sellers on Xelnova. Register today and start reaching millions of customers.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-100 shadow-xl px-10">
                  Create Seller Account <ArrowRight size={20} />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10">
                  Already a Seller? Login
                </Button>
              </Link>
            </div>
            
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-white/80">
              <div className="flex items-center gap-2">
                <Shield size={20} />
                <span>Secure Platform</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={20} />
                <span>Quick Onboarding</span>
              </div>
              <div className="flex items-center gap-2">
                <Headphones size={20} />
                <span>24/7 Support</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-gray-800">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">X</span>
                </div>
                <span className="text-xl font-bold text-white font-display">Xelnova</span>
              </div>
              <p className="text-gray-400 text-sm">
                India's fastest growing e-commerce platform for sellers.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Sell on Xelnova</h4>
              <ul className="space-y-2">
                {['How to Sell', 'Fees & Pricing', 'Seller Policies', 'Seller Tools'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                {['Seller University', 'Help Center', 'Community Forum', 'Success Stories'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                {['seller-support@xelnova.com', '1800-XXX-XXXX', 'Live Chat'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2024 Xelnova. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
