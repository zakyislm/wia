import { Suspense } from "react";
import { Messages } from "@/features/messages/Messages";
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
    <Suspense fallback={<p role="status">Memuat percakapan…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
