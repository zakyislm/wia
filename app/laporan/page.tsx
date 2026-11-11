import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsView } from "@/features/reports/ReportsView";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { generateCollectionPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Laporan",
  description:
    "Direktori laporan warga serta status penanganan instansi pemerintah dan internal di Kavi.",
};

export default function LaporanPage() {
  const schema = generateCollectionPageJsonLd({
    title: "Laporan — Kavi",
    description:
      "Direktori laporan warga serta status penanganan instansi pemerintah dan internal di Kavi.",
    path: "/laporan",
    keywords: [
      "Laporan Warga",
      "Status Penanganan",
      "Tindak Lanjut Instansi",
      "Kavi",
    ],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Suspense fallback={<PageSkeleton variant="directory" />}>
        <ReportsView />
      </Suspense>
    </>
  );
}
