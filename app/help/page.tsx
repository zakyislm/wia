import { Suspense } from "react";
import { Help } from "@/features/settings/Help";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="auth" />}>
      <Help />
    </Suspense>
  );
}
