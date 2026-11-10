import { redirect } from "next/navigation";

export default async function LegacyTopicRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/explore/topics/${encodeURIComponent(slug)}`);
}
