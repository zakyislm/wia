import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { DemoProvider } from "@/features/auth/DemoProvider";
import { PersistentProductChrome } from "@/components/layout/ProductShell";
import { db, topics, tags } from "@/db";
import { generateWebsiteJsonLd } from "@/lib/seo";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kavi.jeki.me";

async function getDynamicRootKeywords(): Promise<string[]> {
  try {
    const [dbTopics, dbTags] = await Promise.all([
      db.select({ name: topics.name }).from(topics).limit(10),
      db.select({ name: tags.name }).from(tags).limit(12),
    ]);
    return Array.from(
      new Set([
        "Kavi",
        "laporan warga",
        "pengaduan masyarakat",
        "aspirasi publik",
        "tindak lanjut instansi",
        ...dbTopics.map((t) => t.name),
        ...dbTags.map((t) => t.name.replace(/^#/, "")),
      ]),
    );
  } catch {
    return [
      "Kavi",
      "laporan warga",
      "pengaduan masyarakat",
      "aspirasi publik",
      "tindak lanjut instansi",
    ];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const keywords = await getDynamicRootKeywords();
  return {
    metadataBase: new URL(appBaseUrl),
    title: {
      default: "Kavi — Ruang Suara & Laporan Warga",
      template: "Kavi - %s",
    },
    description:
      "Platform laporan warga, diskusi publik, dan pemantauan tindak lanjut instansi secara terbuka dan terverifikasi di Indonesia.",
    applicationName: "Kavi",
    authors: [{ name: "Tim Kavi", url: appBaseUrl }],
    creator: "Tim Kavi",
    publisher: "Kavi",
    keywords,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: appBaseUrl,
      siteName: "Kavi",
      title: "Kavi — Ruang Suara & Laporan Warga",
      description:
        "Platform laporan warga, diskusi publik, dan pemantauan tindak lanjut instansi secara terbuka dan terverifikasi di Indonesia.",
      images: [
        {
          url: "/kavi.png",
          width: 512,
          height: 512,
          alt: "Kavi",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Kavi — Ruang Suara & Laporan Warga",
      description:
        "Platform laporan warga, diskusi publik, dan pemantauan tindak lanjut instansi secara terbuka dan terverifikasi di Indonesia.",
      images: ["/kavi.png"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const keywords = await getDynamicRootKeywords();
  const websiteJsonLd = generateWebsiteJsonLd(keywords);

  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={plusJakartaSans.variable}
    >
      <body className={plusJakartaSans.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <DemoProvider>
          <PersistentProductChrome>{children}</PersistentProductChrome>
        </DemoProvider>
      </body>
    </html>
  );
}
