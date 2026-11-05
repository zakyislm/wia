import { Suspense } from "react";
import { Profile } from "@/features/profile/Profile";
async function Content({
  params,
}: {
  params: Promise<{ profileKey: string }>;
}) {
  return <Profile profileKey={(await params).profileKey} />;
}
export default function Page({
  params,
}: {
  params: Promise<{ profileKey: string }>;
}) {
  return (
    <Suspense fallback={<p role="status">Memuat profil…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
