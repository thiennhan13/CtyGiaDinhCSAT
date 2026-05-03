import type {Metadata} from 'next';
import './globals.css';
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'CSAT Tutor',
  description: 'Hệ thống Quản lý Gia sư CSAT',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="vi" className={cn("font-sans", inter.variable)}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
