'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const transition = { duration: 0.25, ease: [0.4, 0, 0.2, 1] };

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Scroll main content to top on every navigation so each tab opens at the top
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, [pathname]);

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
