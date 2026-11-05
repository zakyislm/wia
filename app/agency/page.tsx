import { Suspense } from "react";
import { AgencyInbox } from "@/features/agency/AgencyInbox";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Memuat…</p>}>
      <AgencyInbox />
    </Suspense>
  );
}
