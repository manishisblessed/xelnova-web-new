import type { Metadata } from 'next';
import { Inter, DM_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { BusinessHeader } from '@/components/business-shell/header';
import { BusinessFooter } from '@/components/business-shell/footer';

const SITE_URL = process.env.NEXT_PUBLIC_BUSINESS_SITE_URL || 'http://localhost:3004';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Xelnova Business — Procurement for your organization',
    template: '%s | Xelnova Business',
  },
  description:
    'Shop for your company on Xelnova: catalog search, business checkout with GSTIN, and order tracking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased min-h-screen flex flex-col bg-surface-raised" suppressHydrationWarning>
        <Providers>
          <BusinessHeader />
          <main className="flex-grow">{children}</main>
          <BusinessFooter />
        </Providers>
      </body>
    </html>
  );
}
