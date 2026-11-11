import type { Metadata } from "next";
import { Suspense } from "react";
import { Notifications } from "@/features/notifications/Notifications";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Notifikasi" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="notifications" />}>
      <Notifications />
    </Suspense>
  );
}
