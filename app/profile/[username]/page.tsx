import { Suspense } from "react";
import { Profile } from "@/features/profile/Profile";

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
    <Suspense fallback={<p role="status">Memuat profil…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
