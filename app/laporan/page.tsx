import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsView } from "@/features/reports/ReportsView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Laporan" };

export default function LaporanPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="directory" />}>
      <ReportsView />
    </Suspense>
  );
}
