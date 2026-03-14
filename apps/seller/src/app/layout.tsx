import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import SellerSidebar from "@/components/seller-sidebar";
import SellerHeader from "@/components/seller-header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Xelnova Seller Dashboard",
  description: "Manage your products, orders, and revenue on Xelnova marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable} antialiased bg-warm-100 text-slate-900`}>
        <div className="flex min-h-screen">
          <SellerSidebar />
          <div className="flex-1 ml-[260px] transition-all duration-200">
            <SellerHeader />
            <main className="p-6 sm:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
