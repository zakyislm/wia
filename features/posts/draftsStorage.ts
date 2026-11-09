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
  updatedAt: number;
}

const STORAGE_KEY = "kavi_composer_drafts_v2";

export function loadDrafts(): ComposerDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveDraft(draft: ComposerDraft): ComposerDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const list = loadDrafts().filter((d) => d.id !== draft.id);
    const updatedList = [{ ...draft, updatedAt: Date.now() }, ...list];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    return updatedList;
  } catch {
    return [];
  }
}

export function deleteDraft(id: string): ComposerDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const list = loadDrafts().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

export function formatDraftTime(timestamp: number): string {
  const d = new Date(timestamp);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `Edited ${day} ${month}, ${hours}:${minutes}`;
}
