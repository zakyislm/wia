import type { Metadata } from "next";
import { Suspense } from "react";
import { Messages } from "@/features/messages/Messages";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { db, users } from "@/db";
import { eq, or } from "drizzle-orm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationKey: string }>;
}): Promise<Metadata> {
  const { conversationKey } = await params;
  try {
    const partner = await db.query.users.findFirst({
      where: or(
        eq(users.id, conversationKey),
        eq(users.username, conversationKey),
      ),
      columns: { name: true },
    });
    return {
      title: partner ? `Obrolan dengan ${partner.name}` : "Obrolan",
    };
  } catch {
    return { title: "Obrolan" };
  }
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
