import { Suspense } from "react";
import { Signup } from "@/features/auth/AuthForms";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Memuat…</p>}>
      <Signup />
    </Suspense>
  );
}
