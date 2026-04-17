'use client';

import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  linkText?: string;
  accent?: boolean;
}

export function SectionHeader({ title, subtitle, seeAllHref, linkText = 'View All', accent = false }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-end justify-between mb-7 gap-4"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {accent && (
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
            >
              <Sparkles className="w-5 h-5 text-accent-500" />
            </motion.div>
          )}
          <h2 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-text-primary">
            {title}
          </h2>
        </div>
        <motion.div 
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2.5 h-1 w-16 rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-accent-400 origin-left shadow-sm shadow-primary-500/30" 
          aria-hidden 
        />
        {subtitle && (
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-sm text-text-secondary mt-2.5 max-w-xl"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:text-primary-700 transition-all group bg-primary-50/80 hover:bg-primary-100 px-3.5 py-2 rounded-xl hover:shadow-md hover:shadow-primary-500/10"
        >
          {linkText}
          <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </motion.div>
  );
}
