import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sell on Xelnova — Grow Your Business Online',
  description: 'Join thousands of sellers on Xelnova. Low commissions, fast payments, nationwide reach, and powerful tools to scale your business.',
  icons: {
    icon: '/xelnova-icon-dark.png',
    apple: '/xelnova-icon-dark.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-white" suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
