import { Suspense } from "react";
import { Recovery } from "@/features/auth/AuthForms";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Memuat…</p>}>
      <Recovery />
    </Suspense>
  );
}
