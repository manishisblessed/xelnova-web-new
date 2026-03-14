import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { AdminHeader } from '@/components/admin-header';
import { PageTransition } from '@/components/page-transition';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Xelnova Admin',
  description: 'Xelnova Marketplace Admin Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-screen bg-surface-1 antialiased" suppressHydrationWarning>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <AdminHeader />
            <main className="flex-1 overflow-y-auto bg-surface-1 px-5 pb-8 lg:px-6 transition-[padding] duration-200 ease-out">
              <div className="mx-auto max-w-[1440px]">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
