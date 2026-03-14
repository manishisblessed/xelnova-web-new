'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  linkText?: string;
}

export function SectionHeader({ title, subtitle, seeAllHref, linkText = 'View All' }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="flex items-end justify-between mb-6"
    >
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-text-primary font-display">{title}</h2>
        {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors group"
        >
          {linkText}
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </motion.div>
  );
}
