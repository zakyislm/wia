import { Suspense } from "react";
import { ReportsView } from "@/features/reports/ReportsView";

export default function LaporanPage() {
  return (
    <Suspense fallback={<p role="status">Memuat Laporan…</p>}>
      <ReportsView />
    </Suspense>
  );
}
