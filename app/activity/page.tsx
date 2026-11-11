import type { Metadata } from "next";
import { Suspense } from "react";
import { Activity } from "@/features/settings/Activity";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Aktivitas" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="activity" />}>
      <Activity />
    </Suspense>
  );
}
