"use client";
import React, { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useDemo } from "@/features/auth/DemoProvider";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import type { Person, Post } from "@/types/models";

const HOVER_CARD_MAX_WIDTH = 300;
const HOVER_CARD_ESTIMATED_HEIGHT = 216;
const VIEWPORT_PADDING = 12;
const HOVER_CARD_GAP = 8;

function computeHoverCardPosition(
  triggerRect: DOMRect,
  cardWidth: number,
  cardHeight: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxLeft = Math.max(VIEWPORT_PADDING, vw - cardWidth - VIEWPORT_PADDING);
  const left = Math.min(Math.max(VIEWPORT_PADDING, triggerRect.left), maxLeft);

  const isMobile = vw <= 600;
  const topMargin = isMobile ? 68 : VIEWPORT_PADDING;
  const bottomMargin = isMobile ? 72 : VIEWPORT_PADDING;
  const belowTop = triggerRect.bottom + HOVER_CARD_GAP;
  const aboveTop = triggerRect.top - cardHeight - HOVER_CARD_GAP;

  let top = belowTop;
  if (belowTop + cardHeight > vh - bottomMargin && aboveTop >= topMargin) {
    top = aboveTop;
  } else if (belowTop + cardHeight > vh - bottomMargin) {
    const maxTop = Math.max(topMargin, vh - cardHeight - bottomMargin);
    top = Math.min(Math.max(topMargin, belowTop), maxTop);
  }
  return { top, left };
}

export function countPublicPosts(posts: Post[], authorKey?: string): number {
  if (!authorKey) return 0;
  return posts.filter(
    (p) =>
      !p.isDeleted &&
      !p.hidden &&
      p.authorKey === authorKey &&
      !p.anonymous,
  ).length;
}

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
  const [cardCoords, setCardCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
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
      if (triggerRef.current && typeof window !== "undefined") {
        const estimatedWidth = Math.min(
          HOVER_CARD_MAX_WIDTH,
          window.innerWidth - VIEWPORT_PADDING * 2,
        );
        setCardCoords(
          computeHoverCardPosition(
            triggerRef.current.getBoundingClientRect(),
            estimatedWidth,
            HOVER_CARD_ESTIMATED_HEIGHT,
          ),
        );
      }
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

  useEffect(() => {
    return () => {
      if (enterTimeout.current) clearTimeout(enterTimeout.current);
      if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const card = cardRef.current;
      if (!trigger || !card) return;
      const triggerRect = trigger.getBoundingClientRect();
      if (triggerRect.bottom < 0 || triggerRect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const width =
        card.offsetWidth ||
        Math.min(
          HOVER_CARD_MAX_WIDTH,
          window.innerWidth - VIEWPORT_PADDING * 2,
        );
      const height = card.offsetHeight || HOVER_CARD_ESTIMATED_HEIGHT;
      setCardCoords(computeHoverCardPosition(triggerRect, width, height));
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !cardRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const postCount = useMemo(
    () => countPublicPosts(posts, person.localKey),
    [posts, person.localKey],
  );

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
      ref={triggerRef}
      className="user-hover-trigger-wrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {open && (
        <div
          ref={cardRef}
          className="user-hover-card"
          style={
            cardCoords
              ? { top: `${cardCoords.top}px`, left: `${cardCoords.left}px` }
              : undefined
          }
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
            {person.bio || "Warga aktif di KAVI."}
          </p>

          <div className="user-hover-stats">
            <span className="user-hover-stat">
              <strong>{postCount}</strong> postingan
            </span>
            <span className="user-hover-stat">
              <strong>{followerDisplay}</strong> pengikut
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
                  {isFollowing ? "Mengikuti" : "Ikuti"}
                </button>
                <Link
                  href={`/messages?partner=${person.localKey}`}
                  className="user-hover-btn outline"
                >
                  Kirim Pesan
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
