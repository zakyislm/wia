import { Suspense } from "react";
import { Profile } from "@/features/profile/Profile";
import { PageSkeleton } from "@/components/ui/Skeleton";

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
