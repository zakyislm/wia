import { Suspense } from "react";
import { ExploreView } from "@/features/explore/ExploreView";

export default function ExplorePage() {
  return (
    <Suspense fallback={<p role="status">Memuat Jelajah…</p>}>
      <ExploreView />
    </Suspense>
  );
}
