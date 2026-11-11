import type { Metadata } from "next";
import { Suspense } from "react";
import { Profile } from "@/features/profile/Profile";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { people } from "@/mocks/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const clean = decodeURIComponent(username).replace(/^@/, "").toLowerCase();
  if (clean === "me") return { title: "Profil" };
  const person = people.find(
    (item) =>
      item.username.toLowerCase() === clean ||
      item.localKey.toLowerCase() === clean,
  );
  return { title: person?.name ?? "Profil" };
}

async function Content({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <Profile profileKey={username} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="profile" />}>
      <Content params={params} />
    </Suspense>
  );
}
