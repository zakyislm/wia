import { Suspense } from "react";
import { Messages } from "@/features/messages/Messages";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Memuat…</p>}>
      <Messages />
    </Suspense>
  );
}
