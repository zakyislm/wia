"use client";
import { BadgeCheck } from "lucide-react";
import type { Role } from "@/types/models";

export function VerifiedBadge({
  role,
  size = 16,
}: {
  role?: Role;
  size?: number;
}) {
  if (role === "GOVERNMENT") {
    return (
      <BadgeCheck
        size={size}
        fill="#10b981"
        color="#ffffff"
        className="verified-badge-icon"
        aria-label="Terverifikasi Aparat"
      />
    );
  }
  if (role === "INTERNAL") {
    return (
      <BadgeCheck
        size={size}
        fill="#991b1b"
        color="#ffffff"
        className="verified-badge-icon"
        aria-label="Tim Internal"
      />
    );
  }
  return null;
}
