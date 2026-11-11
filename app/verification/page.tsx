import type { Metadata } from "next";
import { Suspense } from "react";
import { Verification } from "@/features/settings/Verification";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Verifikasi Instansi" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="settings" />}>
      <Verification />
    </Suspense>
  );
}
