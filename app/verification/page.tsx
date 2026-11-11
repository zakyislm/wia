import { Suspense } from "react";
import { Verification } from "@/features/settings/Verification";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="settings" />}>
      <Verification />
    </Suspense>
  );
}
