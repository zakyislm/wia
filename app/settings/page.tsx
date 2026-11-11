import type { Metadata } from "next";
import { Suspense } from "react";
import { Settings } from "@/features/settings/Settings";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Pengaturan" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="settings" />}>
      <Settings />
    </Suspense>
  );
}
