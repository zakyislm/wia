import { Suspense } from "react";
import { Settings } from "@/features/settings/Settings";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Memuat…</p>}>
      <Settings />
    </Suspense>
  );
}
