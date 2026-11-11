"use client";

export const PAGE_SWITCH_COOLDOWN_MS = 1000;
export const SUBTAB_SWITCH_COOLDOWN_MS = 1000;

let lastPageSwitchAt = 0;

function normalizeHrefPath(href: string): string {
  const clean = href.split("#")[0]?.split("?")[0] || "/";
  return clean.length > 1 && clean.endsWith("/") ? clean.slice(0, -1) : clean;
}

/**
 * Enforces a minimum cooldown between user-initiated page navigations across
 * mounted shells. Navigating to the same pathname is ignored without penalty.
 */
export function consumePageSwitchSlot(
  currentPathname: string,
  targetHref: string,
  cooldownMs = PAGE_SWITCH_COOLDOWN_MS,
): boolean {
  const current = normalizeHrefPath(currentPathname);
  const target = normalizeHrefPath(targetHref);
  if (current === target) return true;

  const now = Date.now();
  if (now - lastPageSwitchAt < cooldownMs) {
    return false;
  }
  lastPageSwitchAt = now;
  return true;
}

/** Resets the page-switch cooldown (used by auth state transitions or tests). */
export function resetPageSwitchCooldown() {
  lastPageSwitchAt = 0;
}
