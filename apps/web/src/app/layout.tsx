import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/layout/toaster';
import { Providers } from './providers';

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
  title: 'Xelnova — Online Shopping for Electronics, Fashion, Home & More',
  description: 'Your one-stop marketplace for electronics, fashion, home & more. Best offers on top brands with fast delivery.',
  icons: {
    icon: '/xelnova-icon-dark.png',
    apple: '/xelnova-icon-dark.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        <Providers>
          <Toaster />
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
