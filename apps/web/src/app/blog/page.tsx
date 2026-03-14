'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Calendar, Clock, ArrowRight, Tag } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const featuredPost = {
  title: 'The Future of E-Commerce in India: Trends to Watch in 2026',
  excerpt: 'From AI-powered personalization to same-day delivery, here are the top trends shaping the Indian e-commerce landscape this year.',
  image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop',
  date: 'March 10, 2026',
  readTime: '8 min read',
  category: 'Industry',
};

const posts = [
  { title: '10 Tips for Smart Online Shopping', excerpt: 'Make the most of your online shopping experience with these expert tips on finding deals, comparing products, and staying safe.', image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=250&fit=crop', date: 'March 5, 2026', readTime: '5 min read', category: 'Shopping Tips' },
  { title: 'How Xelnova Ensures Product Quality', excerpt: 'An inside look at our quality assurance process and how we verify every seller and product on our platform.', image: 'https://images.unsplash.com/photo-1586880244386-8b3e34c8382c?w=400&h=250&fit=crop', date: 'February 28, 2026', readTime: '6 min read', category: 'Behind the Scenes' },
  { title: 'Top Electronics Picks for March 2026', excerpt: 'Our curated list of the best electronics deals this month, from smartphones to smart home devices.', image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=250&fit=crop', date: 'February 20, 2026', readTime: '4 min read', category: 'Product Picks' },
  { title: 'Sustainable Shopping: A Guide', excerpt: 'How to make eco-friendly choices while shopping online. Discover sustainable brands and practices.', image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=250&fit=crop', date: 'February 15, 2026', readTime: '7 min read', category: 'Sustainability' },
  { title: 'Seller Success Stories: From Side Hustle to Full-Time', excerpt: 'Meet three sellers who turned their passion into a thriving business on Xelnova.', image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=250&fit=crop', date: 'February 8, 2026', readTime: '6 min read', category: 'Seller Stories' },
  { title: 'Fashion Trends for Spring 2026', excerpt: 'The hottest fashion trends this spring season and where to find them at the best prices on Xelnova.', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=250&fit=crop', date: 'February 1, 2026', readTime: '5 min read', category: 'Fashion' },
];

const categories = ['All', 'Industry', 'Shopping Tips', 'Product Picks', 'Seller Stories', 'Fashion', 'Sustainability'];

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <BookOpen size={14} /> Our Blog
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white font-display mb-4">Xelnova Blog</h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto">Insights, tips, and stories from the world of e-commerce.</p>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-6 border-b border-border">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
            {categories.map((cat, i) => (
              <button
                key={cat}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  i === 0
                    ? 'bg-primary-600 text-white shadow-primary'
                    : 'bg-surface-muted text-text-secondary hover:bg-primary-50 hover:text-primary-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="py-12">
        <div className="mx-auto max-w-[1440px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Link href="#" className="group block bg-white rounded-3xl border border-border/60 overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
              <div className="grid md:grid-cols-2">
                <div className="relative aspect-[16/10] md:aspect-auto">
                  <Image src={featuredPost.image} alt={featuredPost.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-8 md:p-10 flex flex-col justify-center">
                  <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold w-fit mb-4">
                    <Tag size={12} /> {featuredPost.category}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary font-display mb-3 group-hover:text-primary-600 transition-colors leading-tight">
                    {featuredPost.title}
                  </h2>
                  <p className="text-text-secondary leading-relaxed mb-5">{featuredPost.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {featuredPost.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {featuredPost.readTime}</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-12">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <motion.div key={post.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <Link href="#" className="group block bg-white rounded-2xl border border-border/60 overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                  <div className="relative aspect-[16/10]">
                    <Image src={post.image} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-text-primary px-2.5 py-1 rounded-full text-[11px] font-semibold">{post.category}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-text-primary font-display mb-2 group-hover:text-primary-600 transition-colors leading-snug">{post.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1"><Calendar size={11} /> {post.date}</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {post.readTime}</span>
                      </div>
                      <ArrowRight size={14} className="text-text-muted group-hover:text-primary-600 transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
