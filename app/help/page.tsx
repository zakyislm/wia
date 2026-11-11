import type { Metadata } from "next";
import { Suspense } from "react";
import { Help } from "@/features/settings/Help";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Bantuan" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="auth" />}>
      <Help />
    </Suspense>
  );
}
