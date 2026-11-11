import { Suspense } from "react";
import { Recovery } from "@/features/auth/AuthForms";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="auth" />}>
      <Recovery />
    </Suspense>
  );
}
