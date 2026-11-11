import type { Metadata } from "next";
import { Suspense } from "react";
import { TasksView } from "@/features/tasks/TasksView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Tugas" };

export default function TugasPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="directory" />}>
      <TasksView />
    </Suspense>
  );
}
