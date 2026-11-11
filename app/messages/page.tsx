import type { Metadata } from "next";
import { Suspense } from "react";
import { Messages } from "@/features/messages/Messages";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Obrolan" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="messages" />}>
      <Messages />
    </Suspense>
  );
}
