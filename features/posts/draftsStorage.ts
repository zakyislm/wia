import type { Topic } from "@/types/models";

export interface ComposerDraft {
  id: string;
  mode: "post" | "report";
  title: string;
  content: string;
  topic: Topic | null;
  location: string;
  tags: string[];
  images: string[];
  anonymous?: boolean;
  updatedAt: number;
}

let memoryDrafts: ComposerDraft[] = [];
let hydratedFromApi = false;

export async function syncDraftsFromApi(): Promise<ComposerDraft[]> {
  if (typeof window === "undefined") return memoryDrafts;
  try {
    const res = await fetch("/api/drafts", { credentials: "same-origin" });
    if (!res.ok) return memoryDrafts;
    const json = await res.json();
    if (Array.isArray(json.data)) {
      hydratedFromApi = true;
      const apiDrafts: ComposerDraft[] = json.data.map((d: any) => ({
        id: d.id,
        mode: d.kind === "report" ? "report" : "post",
        title: d.title || "",
        content: d.content || "",
        topic: d.category
          ? {
              id: `top_${String(d.category).toLowerCase()}`,
              name: d.category,
              slug: String(d.category).toLowerCase(),
            }
          : null,
        location: d.province || "",
        tags: [],
        images: [],
        anonymous: Boolean(d.anonymous),
        updatedAt: Number(d.savedAt || Date.now()),
      }));
      const mergedMap = new Map<string, ComposerDraft>();
      for (const item of [...memoryDrafts, ...apiDrafts]) {
        mergedMap.set(item.id, item);
      }
      memoryDrafts = Array.from(mergedMap.values()).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
    }
  } catch {
    // Offline / non-network fallback
  }
  return memoryDrafts;
}

export function loadDrafts(): ComposerDraft[] {
  if (typeof window !== "undefined" && !hydratedFromApi) {
    hydratedFromApi = true;
    void syncDraftsFromApi();
  }
  return memoryDrafts;
}

export function saveDraft(draft: ComposerDraft): ComposerDraft[] {
  const updatedDraft = { ...draft, updatedAt: Date.now() };
  memoryDrafts = [
    updatedDraft,
    ...memoryDrafts.filter((d) => d.id !== draft.id),
  ];

  if (typeof window !== "undefined") {
    void fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updatedDraft.id,
        kind: updatedDraft.mode === "report" ? "report" : "general",
        title: updatedDraft.title,
        content: updatedDraft.content,
        province: updatedDraft.location,
        category: updatedDraft.topic?.name || "",
        anonymous: Boolean(updatedDraft.anonymous),
      }),
    }).catch(() => {});
  }

  return memoryDrafts;
}

export function deleteDraft(id: string): ComposerDraft[] {
  memoryDrafts = memoryDrafts.filter((d) => d.id !== id);
  if (typeof window !== "undefined") {
    void fetch(`/api/drafts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
  }
  return memoryDrafts;
}

export function formatDraftTime(timestamp: number, prefix = "Edited"): string {
  const d = new Date(timestamp);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${prefix} ${day} ${month}, ${hours}:${minutes}`;
}
