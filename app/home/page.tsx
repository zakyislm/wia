import type { Metadata } from "next";
import { Feed } from "@/features/feed/Feed";
import { generateCollectionPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Linimasa laporan warga, aspirasi publik, dan tindak lanjut instansi resmi di Kavi.",
};

export default function HomePage() {
  const schema = generateCollectionPageJsonLd({
    title: "Beranda — Kavi",
    description:
      "Linimasa laporan warga, aspirasi publik, dan tindak lanjut instansi resmi di Kavi.",
    path: "/home",
    keywords: ["Beranda Kavi", "Laporan Warga", "Diskusi Publik Indonesia"],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Feed />
    </>
  );
}
