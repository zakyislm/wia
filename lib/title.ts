import type { Post } from "@/types/models";

export const TITLE_BRAND = "Kavi";
export const TITLE_WORD_LIMIT = 5;
export const TITLE_QUERY_MAX_CHARS = 40;

export function formatPageTitle(subtitle?: string | null): string {
  const clean = subtitle?.trim();
  return clean ? `${TITLE_BRAND} - ${clean}` : TITLE_BRAND;
}

export function truncateTitleQuery(
  query: string,
  maxChars = TITLE_QUERY_MAX_CHARS,
): string {
  const clean = query.trim().replace(/\s+/g, " ");
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars).trimEnd()}...`;
}

export function takeFirstWords(
  text: string,
  limit = TITLE_WORD_LIMIT,
): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const words = clean.split(" ");
  if (words.length <= limit) return words.join(" ");
  return `${words.slice(0, limit).join(" ")}...`;
}

export function formatSearchTitle(
  query: string,
  scopeName?: string | null,
): string {
  const truncated = truncateTitleQuery(query);
  if (!truncated) return formatPageTitle(scopeName);
  const cleanScope = scopeName?.trim();
  return cleanScope
    ? formatPageTitle(`Hasil "${truncated}" di ${cleanScope}`)
    : formatPageTitle(`Hasil "${truncated}"`);
}

export function formatPostPageTitle(
  post: Pick<Post, "content" | "kind" | "anonymous">,
  authorName?: string | null,
  branchContent?: string | null,
): string {
  if (branchContent !== undefined) {
    const replySnippet = takeFirstWords(branchContent ?? "");
    if (replySnippet) {
      return formatPageTitle(`Balasan ${replySnippet}`);
    }
    const postSource =
      post.kind === "report"
        ? (post.content.split(/\r?\n+/).find((line) => line.trim()) ?? "")
        : post.content;
    const postSnippet = takeFirstWords(postSource);
    return formatPageTitle(`Balasan ${postSnippet || "Postingan"}`);
  }

  const displayAuthor = post.anonymous
    ? "Anonim"
    : authorName?.trim() || "Warga";
  const sourceText =
    post.kind === "report"
      ? (post.content.split(/\r?\n+/).find((line) => line.trim()) ?? "")
      : post.content;
  const snippet = takeFirstWords(sourceText);
  const fallbackLabel = post.kind === "report" ? "Laporan" : "Postingan";
  return formatPageTitle(`${displayAuthor}: ${snippet || fallbackLabel}`);
}
