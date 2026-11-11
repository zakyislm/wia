import type { Metadata } from "next";
import { Suspense } from "react";
import { Recovery } from "@/features/auth/AuthForms";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Lupa Kata Sandi" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="auth" />}>
      <Recovery />
    </Suspense>
  );
}
