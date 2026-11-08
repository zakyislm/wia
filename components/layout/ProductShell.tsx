"use client";
import Link from "next/link";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { QuickSearchModal } from "@/components/search/QuickSearchModal";
import { NewsOfTheDayCard } from "@/components/news/NewsOfTheDayCard";
import { HighlightSection } from "@/components/news/HighlightSection";
import {
  Home,
  Search,
  MessagesSquare,
  Bell,
  UserRound,
  ListTree,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { Login } from "@/features/auth/Login";
import { Composer } from "@/features/posts/Composer";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";

const destinations = [
  { label: "Beranda", icon: Home, href: "/home" },
  { label: "Jelajah", icon: Search, href: "/explore" },
  { label: "Obrolan", icon: MessagesSquare, href: "/messages" },
  { label: "Notifikasi", icon: Bell, href: "/notifications" },
  { label: "Profil", icon: UserRound, href: "/profile" },
  { label: "Timeline Kinerja", icon: ListTree, href: "/timeline" },
  { label: "Pengaturan", icon: Settings, href: "/settings" },
];
export function ProductShell({
  title,
  children,
  active = "home",
  wide = false,
}: {
  title: ReactNode;
  children: ReactNode;
  active?:
    | "home"
    | "explore"
    | "timeline"
    | "profile"
    | "messages"
    | "notifications"
    | "settings"
    | "agency";
  wide?: boolean;
}) {
  const { people, posts, user, logout, following, setFollowing, theme } = useDemo();
  const [composer, setComposer] = useState(false);
  const [searchModal, setSearchModal] = useState(false);

  const topTrendingPost = useMemo(() => {
    const candidates = posts.filter((p) => !p.isDeleted && !p.hidden);
    if (!candidates.length) return null;
    return [...candidates].sort((a, b) => {
      const scoreA = a.upvotesCount * 1.5 + (a.replies?.length ?? 0) * 2;
      const scoreB = b.upvotesCount * 1.5 + (b.replies?.length ?? 0) * 2;
      return scoreB - scoreA;
    })[0];
  }, [posts]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModal((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!user) return <Login />;
  return (
    <div
      className={`product ${theme === "dark" ? "theme-dark" : theme === "light" ? "theme-light" : "theme-system"} ${wide ? "product--messages" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Lewati navigasi
      </a>
      <aside className="sidebar">
        <Link href="/home" className="wordmark">
          kavi
        </Link>
        <nav aria-label="Navigasi utama">
          {destinations.map(({ label, icon: Icon, href }, index) =>
            href ? (
              <Link
                key={label}
                aria-label={label}
                href={href}
                aria-current={href === `/${active}` ? "page" : undefined}
                className={`nav-item ${href === `/${active}` ? "active" : ""} nav-group-${index}`}
              >
                <Icon />
                <span>{label}</span>
              </Link>
            ) : null,
          )}
          {user.role === "GOVERNMENT" && (
            <Link
              className={`nav-item ${active === "agency" ? "active" : ""}`}
              href="/agency"
              aria-label="Laporan Instansi"
            >
              <ListTree />
              <span>Laporan Instansi</span>
            </Link>
          )}
        </nav>
        <Button className="compose-nav" onClick={() => setComposer(true)}>
          <Plus />
          <span>Buat Postingan</span>
        </Button>
        <div className="sidebar-account">
          <Avatar name={user.name} src={user.image} />
          <div>
            <strong>{user.name}</strong>
            <small>@{user.username}</small>
          </div>
          <Button variant="ghost" aria-label="Keluar demo" onClick={logout}>
            <LogOut />
          </Button>
        </div>
      </aside>
      <main id="main-content" className="reading-column">
        <header className="page-header">
          {typeof title === "string" ? <h1>{title}</h1> : title}
          <div>
            <Link
              className="button button--ghost mobile-bell"
              href="/notifications"
              aria-label="Notifikasi"
            >
              <Bell />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        {children}
        <Button
          className="floating-compose"
          aria-label="Buat postingan"
          onClick={() => setComposer(true)}
        >
          <Plus />
        </Button>
      </main>
      <aside className="support-column">
        <div className="support-search-wrapper">
          <button
            type="button"
            className="search-box search-box-trigger"
          onClick={() => setSearchModal(true)}
          aria-label="Cari di KAVI"
        >
          <div className="search-box-left">
            <Search size={16} />
            <span>Cari di KAVI</span>
          </div>
          </button>
        </div>
        {/* KAVI News Of The Day */}
        <NewsOfTheDayCard post={topTrendingPost} />

        {/* Highlight Trending Tags */}
        <HighlightSection />

        <section className="suggestions">
          <h2>Temukan suara baru</h2>
          {people
            .filter((person) =>
              ["pupr", "komunitas", "dishub"].includes(person.localKey),
            )
            .map((person) => (
              <div className="suggestion" key={person.localKey}>
                <Avatar name={person.name} src={person.image} />
                <div>
                  <strong>
                    <Link href={`/profile/${person.localKey}`}>
                      {person.name}
                    </Link>
                    {person.role === "GOVERNMENT" ? " ✓" : ""}
                  </strong>
                  <small>{person.bio}</small>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setFollowing((current) =>
                      current.includes(person.localKey)
                        ? current.filter((key) => key !== person.localKey)
                        : [...current, person.localKey],
                    )
                  }
                >
                  {following.includes(person.localKey) ? "Diikuti" : "Ikuti"}
                </Button>
              </div>
            ))}
        </section>
        <p className="footer-note">
          <Link href="/settings">Pengaturan</Link> ·{" "}
          <Link href="/help">Bantuan</Link>
          <br />
          KAVI · Ruang bersama untuk perubahan.
          <br />© 2026 KAVI · Konten contoh
        </p>
      </aside>
      <nav className="mobile-island" aria-label="Navigasi seluler">
        <Link
          href="/home"
          aria-label="Beranda"
          aria-current={active === "home" ? "page" : undefined}
          className={active === "home" ? "active" : ""}
        >
          <Home />
        </Link>
        <Link
          href="/explore"
          aria-label="Jelajah"
          aria-current={active === "explore" ? "page" : undefined}
          className={active === "explore" ? "active" : ""}
        >
          <Search />
        </Link>
        <button
          className="island-compose"
          aria-label="Buat postingan"
          onClick={() => setComposer(true)}
        >
          <Plus />
        </button>
        <Link
          href="/messages"
          aria-label="Obrolan"
          aria-current={active === "messages" ? "page" : undefined}
          className={active === "messages" ? "active" : ""}
        >
          <MessagesSquare />
        </Link>
        <Link
          href="/timeline"
          aria-label="Timeline Kinerja"
          aria-current={active === "timeline" ? "page" : undefined}
          className={active === "timeline" ? "active" : ""}
        >
          <ListTree />
        </Link>
        <Link
          href="/profile"
          aria-label="Profil"
          aria-current={active === "profile" ? "page" : undefined}
          className={active === "profile" ? "active" : ""}
        >
          <UserRound />
        </Link>
      </nav>
      {composer && <Composer onClose={() => setComposer(false)} />}
      <QuickSearchModal
        isOpen={searchModal}
        onClose={() => setSearchModal(false)}
      />
    </div>
  );
}
