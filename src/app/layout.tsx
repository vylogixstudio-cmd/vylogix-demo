import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  variable: "--font-plus-jakarta-sans",
  weight: ['400', '500', '600', '700', '800'] 
});

export const metadata: Metadata = {
  title: "Vylogix CRM & Client Portal",
  description: "Client portal for Vylogix Studio projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${plusJakartaSans.variable} font-sans bg-[#F8F9FA] text-[#111827] antialiased`}>
        {children}
      </body>
    </html>
  );
}
