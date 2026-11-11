import { Suspense } from "react";
import { ReportsView } from "@/features/reports/ReportsView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function LaporanPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="directory" />}>
      <ReportsView />
    </Suspense>
  );
}
