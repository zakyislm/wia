import { Suspense } from "react";
import { Help } from "@/features/settings/Help";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Memuat…</p>}>
      <Help />
    </Suspense>
  );
}
