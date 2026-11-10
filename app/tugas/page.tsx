import { Suspense } from "react";
import { TasksView } from "@/features/tasks/TasksView";

export default function TugasPage() {
  return (
    <Suspense fallback={<p role="status">Memuat Tugas…</p>}>
      <TasksView />
    </Suspense>
  );
}
