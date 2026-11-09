"use client";
import React, { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useDemo } from "@/features/auth/DemoProvider";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import type { Person } from "@/types/models";

interface UserHoverCardProps {
  person: Person;
  children: React.ReactNode;
}

const mockFollowerMap: Record<string, string> = {
  nadia: "571k",
  pupr: "24.5k",
  dishub: "18.2k",
  komunitas: "12.4k",
  alya: "1.2k",
};

export function UserHoverCard({ person, children }: UserHoverCardProps) {
  const { user, following, setFollowing, posts } = useDemo();
  const [open, setOpen] = useState(false);
  const enterTimeout = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const isOwn = user?.localKey === person.localKey;
  const isFollowing = following.includes(person.localKey);

  const handleMouseEnter = () => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;
    }
    enterTimeout.current = setTimeout(() => {
      setOpen(true);
    }, 280);
  };

  const handleMouseLeave = () => {
    if (enterTimeout.current) {
      clearTimeout(enterTimeout.current);
      enterTimeout.current = null;
    }
    leaveTimeout.current = setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  const postCount = useMemo(() => {
    const authored = posts.filter(
      (p) => !p.isDeleted && p.authorKey === person.localKey && !p.anonymous,
    ).length;
    return authored > 0 ? authored : 12;
  }, [posts, person.localKey]);

  const followerDisplay = useMemo(() => {
    if (mockFollowerMap[person.localKey]) {
      return mockFollowerMap[person.localKey];
    }
    return "571k";
  }, [person.localKey]);

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFollowing((current) =>
      current.includes(person.localKey)
        ? current.filter((key) => key !== person.localKey)
        : [...current, person.localKey],
    );
  };

  const profileHref = `/profile/${person.username || person.localKey}`;

  return (
    <span
      className="user-hover-trigger-wrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {open && (
        <div
          className="user-hover-card"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="user-hover-header">
            <div className="user-hover-names">
              <Link href={profileHref} className="user-hover-name">
                {person.name}
                <VerifiedBadge role={person.role} size={17} />
              </Link>
              <span className="user-hover-username">@{person.username}</span>
            </div>
            <Link href={profileHref} className="user-hover-avatar-link">
              <Avatar name={person.name} src={person.image} />
            </Link>
          </div>

          <p className="user-hover-bio">
            {person.bio ||
              "Just a mom that care with her countrysituation. #SuarakanRakyat"}
          </p>

          <div className="user-hover-stats">
            <span className="user-hover-stat">
              <strong>{postCount}</strong> posts
            </span>
            <span className="user-hover-stat">
              <strong>{followerDisplay}</strong> followers
            </span>
          </div>

          <div className="user-hover-actions">
            {isOwn ? (
              <Link href="/profile/@me" className="user-hover-btn solid">
                Edit profil
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className={`user-hover-btn ${isFollowing ? "outline" : "solid"}`}
                  onClick={handleToggleFollow}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
                <Link
                  href={`/messages?partner=${person.localKey}`}
                  className="user-hover-btn outline"
                >
                  Message
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
