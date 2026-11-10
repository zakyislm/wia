import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { DemoProvider } from "@/features/auth/DemoProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Kavi",
  description: "Platform Laporan & Diskusi Publik",
  icons: {
    icon: "/kavi.png",
    apple: "/kavi.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth" className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
