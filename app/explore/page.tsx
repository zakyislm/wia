import { Suspense } from "react";
import { Directory } from "@/features/discovery/Directory";
export default function ExplorePage() {
  return (
    <Suspense fallback={<p role="status">Memuat Jelajah…</p>}>
      <Directory />
    </Suspense>
  );
}
