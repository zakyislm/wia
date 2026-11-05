import { Suspense } from "react";
import { Directory } from "@/features/discovery/Directory";
export default function TimelinePage() {
  return (
    <Suspense fallback={<p role="status">Memuat Timeline…</p>}>
      <Directory timeline />
    </Suspense>
  );
}
