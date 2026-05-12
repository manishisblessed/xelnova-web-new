import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/layout/toaster';
import { Providers } from './providers';
import { BusinessOrgBanner } from '@/components/business-shell/org-banner';

const SITE_URL = process.env.NEXT_PUBLIC_BUSINESS_SITE_URL || 'http://localhost:3004';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Xelnova Business — Procurement for your organization',
    template: '%s | Xelnova Business',
  },
  description:
    'Shop for your company on Xelnova: full marketplace catalog with business checkout (GSTIN), wallet, order tracking and more.',
  icons: {
    icon: '/xelnova-icon-dark.png',
    apple: '/xelnova-icon-dark.png',
  },
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        <Providers>
          <Toaster />
          <BusinessOrgBanner />
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <main className="flex-grow">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
