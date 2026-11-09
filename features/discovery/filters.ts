import type { Person, Post, ReportStatus } from "@/types/models";
import { resolutionResult } from "@/lib/validation";

export interface SearchFilters {
  query: string;
  region: string[];
  agency: string[];
  category: string[];
  kind: string[];
  from: string;
  to: string;
}
export const emptyFilters: SearchFilters = {
  query: "",
  region: [],
  agency: [],
  category: [],
  kind: [],
  from: "",
  to: "",
};

export function jakartaDay(timestamp: number) {
  return new Date(timestamp + 7 * 3600000).toISOString().slice(0, 10);
}

export function getEffectiveReportStatus(post: Post): ReportStatus {
  if (post.reportStatus) return post.reportStatus;
  if (post.replies.some((r) => r.is_action_taken)) return "in_progress";
  const latest = post.resolutions.at(-1);
  if (latest) {
    const res = resolutionResult(latest);
    if (res === "success" || res === "automatic") return "completed";
    if (res === "active") return "in_progress";
  }
  return "waiting";
}

export function closureDate(post: Post, now: number): number | null {
  if (post.isDeleted || post.kind !== "report") return null;
  const status = getEffectiveReportStatus(post);
  if (status === "completed" || status === "closed_internal") {
    return post.closedAt ?? post.postedAt;
  }
  const latest = post.resolutions.at(-1);
  if (!latest) return null;
  const result = resolutionResult(latest, now);
  return result === "success" || result === "automatic"
    ? latest.deadline
    : null;
}

export function filterPosts(
  posts: Post[],
  people: Person[],
  filters: SearchFilters,
  timeline: boolean,
  now: number,
) {
  const query = filters.query.trim().toLocaleLowerCase("id-ID");
  return posts
    .filter((post) => {
      if (post.isDeleted) return false;
      const closed = closureDate(post, now);
      if (timeline && closed === null) return false;
      if (filters.kind.length && !filters.kind.includes(post.kind))
        return false;
      if (filters.region.length && !filters.region.includes(post.province))
        return false;
      if (filters.category.length && !filters.category.includes(post.category))
        return false;
      if (
        filters.agency.length &&
        !filters.agency.some((key) => post.agencyKeys.includes(key))
      )
        return false;
      const day = jakartaDay(timeline ? closed! : post.postedAt);
      if (
        (filters.from && day < filters.from) ||
        (filters.to && day > filters.to)
      )
        return false;
      const author = post.anonymous
        ? "Anonim"
        : people
            .filter((person) => person.localKey === post.authorKey)
            .map((person) => `${person.name} ${person.username}`)
            .join(" ");
      const agencies = people
        .filter((person) => post.agencyKeys.includes(person.localKey))
        .map((person) => `${person.name} ${person.username}`)
        .join(" ");
      const tagsStr = post.tags
        ? post.tags.map((t) => "#" + t + " " + t).join(" ")
        : "";
      return `${post.content} ${tagsStr} ${post.province} ${post.category} ${author} ${agencies}`
        .toLocaleLowerCase("id-ID")
        .includes(query);
    })
    .sort((a, b) =>
      timeline
        ? closureDate(b, now)! - closureDate(a, now)!
        : b.postedAt - a.postedAt,
    );
}
