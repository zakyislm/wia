import { Suspense } from "react";
import { Notifications } from "@/features/notifications/Notifications";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Memuat…</p>}>
      <Notifications />
    </Suspense>
  );
}
