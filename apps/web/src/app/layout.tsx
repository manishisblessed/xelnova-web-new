import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/layout/toaster';
import { Providers } from './providers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.xelnova.in';

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
    default: 'Xelnova — Online Shopping for Electronics, Fashion, Home & More',
    template: '%s | Xelnova',
  },
  description: 'Your one-stop marketplace for electronics, fashion, home & more. Best offers on top brands with fast delivery across India.',
  keywords: ['online shopping', 'electronics', 'fashion', 'home decor', 'marketplace', 'Xelnova', 'India'],
  authors: [{ name: 'Xelnova' }],
  creator: 'Xelnova',
  publisher: 'Xelnova',
  icons: {
    icon: '/xelnova-icon-dark.png',
    apple: '/xelnova-icon-dark.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Xelnova',
    title: 'Xelnova — Online Shopping for Electronics, Fashion, Home & More',
    description: 'Your one-stop marketplace for electronics, fashion, home & more. Best offers on top brands with fast delivery.',
    images: [{ url: `${SITE_URL}/xelnova-og.png`, width: 1200, height: 630, alt: 'Xelnova' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xelnova — Online Shopping',
    description: 'Your one-stop marketplace for electronics, fashion, home & more.',
    images: [`${SITE_URL}/xelnova-og.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Xelnova',
    url: SITE_URL,
    logo: `${SITE_URL}/xelnova-icon-dark.png`,
    sameAs: [
      'https://www.facebook.com/people/Xelnova-India/pfbid02dQmA3L3AMABgPWSJUmWb39d9eCnWj37QyCt3r2c3Yup6iub2J66UX99A6pPnyVFRl/',
      'https://www.youtube.com/@XelnovaIndia',
      'https://www.instagram.com/xelnova.in',
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '122/1, Pole No - New Line, Sector No. 28, Bamnoli, Dwarka',
      addressLocality: 'New Delhi',
      addressRegion: 'DL',
      postalCode: '110077',
      addressCountry: 'IN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-9259131155',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: 'English',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Xelnova',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>
          <Toaster />
          <Header />
          <main className="flex-grow pb-[env(safe-area-inset-bottom,0px)]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
