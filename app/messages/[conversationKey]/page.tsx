import type { Metadata } from "next";
import { Suspense } from "react";
import { Messages } from "@/features/messages/Messages";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { people } from "@/mocks/data";
import { seedWorkspace } from "@/features/workspace/state";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationKey: string }>;
}): Promise<Metadata> {
  const { conversationKey } = await params;
  const conv = seedWorkspace().conversations.find(
    (item) => item.localKey === conversationKey,
  );
  const partner = conv
    ? people.find((person) => person.localKey === conv.partnerKey)
    : undefined;
  return {
    title: partner ? `Obrolan dengan ${partner.name}` : "Obrolan",
  };
}

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
