import { Suspense } from "react";
import { ExploreView } from "@/features/explore/ExploreView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function ExplorePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="directory" />}>
      <ExploreView />
    </Suspense>
  );
}
