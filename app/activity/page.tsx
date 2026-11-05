import { Suspense } from "react";
import { Activity } from "@/features/settings/Activity";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Memuat…</p>}>
      <Activity />
    </Suspense>
  );
}
