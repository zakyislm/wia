import { matchesJurisdiction } from "@/lib/regions";
import type { Person, Post } from "@/types/models";

export interface PostPermissions {
  isOwnPost: boolean;
  isReport: boolean;
  isGovernment: boolean;
  isInternal: boolean;
  inGovScope: boolean;
  canTakeGovAction: boolean;
  canTakeInternalAction: boolean;
  canModerateReport: boolean;
  hasReportSection: boolean;
  canFollow: boolean;
  canHide: boolean;
  canMute: boolean;
  canReport: boolean;
  canBlock: boolean;
  canDelete: boolean;
  hasDangerSection: boolean;
}

/** Derive dot-3 menu action visibility from the signed-in account role, ownership, and jurisdiction. */
export function getPostPermissions(
  post: Post,
  user?: Person | null,
): PostPermissions {
  const isOwnPost = Boolean(user && post.authorKey === user.localKey);
  const isReport = post.kind === "report";
  const isGovernment = user?.role === "GOVERNMENT";
  const isInternal = user?.role === "INTERNAL";

  const inGovScope =
    isReport &&
    isGovernment &&
    Boolean(
      user &&
        (post.agencyKeys.includes(user.localKey) ||
          matchesJurisdiction(
            post.locationName || post.content,
            post.province,
            user.region || "Indonesia",
          )),
    );

  const canTakeGovAction = isReport && inGovScope;
  const canTakeInternalAction = isReport && isInternal;
  const canModerateReport = isReport && (isInternal || inGovScope);
  const hasReportSection =
    canTakeGovAction || canTakeInternalAction || canModerateReport;

  const canFollow = Boolean(user) && !isOwnPost && !post.anonymous;
  const canHide = Boolean(user) && !isOwnPost;
  const canMute = Boolean(user) && !isOwnPost && !post.anonymous;
  const canReport = Boolean(user) && !isOwnPost;
  const canBlock = Boolean(user) && !isOwnPost && !post.anonymous;
  const canDelete = Boolean(user && (isOwnPost || isInternal));
  const hasDangerSection = canMute || canReport || canBlock || canDelete;

  return {
    isOwnPost,
    isReport,
    isGovernment,
    isInternal,
    inGovScope,
    canTakeGovAction,
    canTakeInternalAction,
    canModerateReport,
    hasReportSection,
    canFollow,
    canHide,
    canMute,
    canReport,
    canBlock,
    canDelete,
    hasDangerSection,
  };
}
