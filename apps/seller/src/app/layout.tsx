import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' });

export const metadata: Metadata = {
  title: 'Xelnova Seller',
  description: 'Seller dashboard',
  icons: {
    icon: '/xelnova-icon-dark.png',
    apple: '/xelnova-icon-dark.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased min-h-screen" suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
