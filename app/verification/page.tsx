import { Suspense } from "react";
import { Verification } from "@/features/settings/Verification";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Memuat…</p>}>
      <Verification />
    </Suspense>
  );
}
