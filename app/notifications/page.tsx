import { Suspense } from "react";
import { Notifications } from "@/features/notifications/Notifications";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="notifications" />}>
      <Notifications />
    </Suspense>
  );
}
