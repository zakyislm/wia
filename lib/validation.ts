import type { Resolution } from "@/types/models";

export const ACTION_VALIDATION_MIN_VOTES = 40;
export const ACTION_VALIDATION_MIN_APPROVAL_PERCENT = 83;

export function shouldAutoCloseAction(
  upvotes: number,
  downvotes: number,
): boolean {
  const total = upvotes + downvotes;
  if (total < ACTION_VALIDATION_MIN_VOTES) return false;
  return upvotes * 100 >= ACTION_VALIDATION_MIN_APPROVAL_PERCENT * total;
}

export function resolutionResult(resolution: Resolution, now = Date.now()) {
  if (now < resolution.deadline) return "active";
  const total = resolution.agree + resolution.disagree;
  if (total === 0) return "automatic";
  return resolution.agree / total >= 0.8 ? "success" : "failed";
}

export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
];

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm"];

export function extractClipboardMediaFiles(
  clipboardData: DataTransfer | null,
): File[] {
  if (!clipboardData) return [];
  const itemFiles = Array.from(clipboardData.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
  if (itemFiles.length > 0) return itemFiles;
  return Array.from(clipboardData.files ?? []);
}

export function mediaError(
  files: File[],
  existingCount: number,
): string | null {
  if (files.length + existingCount > 6) return "Maksimal 6 media per postingan.";
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const validExt = ALLOWED_EXTENSIONS.includes(ext);
    const validType = ALLOWED_MEDIA_TYPES.includes(file.type) || validExt;
    if (!validType) {
      return "Format tidak didukung. Hanya mendukung PNG, JPG, WebP, GIF, MP4, atau WebM.";
    }
    if (file.size > 10 * 1024 * 1024) {
      return `Ukuran file "${file.name || "tempelan"}" melebihi batas 10 MB.`;
    }
  }
  return null;
}

export const photoError = mediaError;
