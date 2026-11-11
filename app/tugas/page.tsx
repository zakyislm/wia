import { Suspense } from "react";
import { TasksView } from "@/features/tasks/TasksView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function TugasPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="directory" />}>
      <TasksView />
    </Suspense>
  );
}
