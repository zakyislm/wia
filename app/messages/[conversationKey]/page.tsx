import { Suspense } from "react";
import { Messages } from "@/features/messages/Messages";
import { PageSkeleton } from "@/components/ui/Skeleton";

async function Content({
  params,
}: {
  params: Promise<{ conversationKey: string }>;
}) {
  return <Messages selectedKey={(await params).conversationKey} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ conversationKey: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="messages" />}>
      <Content params={params} />
    </Suspense>
  );
}
