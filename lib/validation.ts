import type { Resolution } from "@/types/models";

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
      return `Ukuran file "${file.name}" melebihi batas 10 MB.`;
    }
  }
  return null;
}

export const photoError = mediaError;
