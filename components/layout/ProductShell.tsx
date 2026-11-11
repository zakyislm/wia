"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  QuickSearchModal,
  SearchTriggerButton,
} from "@/components/search/QuickSearchModal";
import { HighlightSection } from "@/components/news/HighlightSection";
import {
  Home,
  Search,
  MessagesSquare,
  Bell,
  UserRound,
  Archive,
  FileExclamationPoint,
  Settings,
  MoreHorizontal,
  LogOut,
  Plus,
  ChevronDown,
  PenSquare,
  Megaphone,
  ArrowLeft,
} from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { Composer } from "@/features/posts/Composer";
import { CreateDropdown } from "@/components/layout/CreateDropdown";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { Button } from "@/components/ui/Button";
import { consumePageSwitchSlot } from "@/lib/navigationGuard";
import { formatPageTitle, formatSearchTitle } from "@/lib/title";

let activeDocTitleToken = 0;
const useBrowserLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type ProductShellActive =
  | "home"
  | "explore"
  | "laporan"
  | "timeline"
  | "profile"
  | "messages"
  | "notifications"
  | "settings"
  | "tugas"
  | "agency";

interface SearchModalContextValue {
  openSearch: () => void;
  query: string;
}

const SearchModalContext = createContext<SearchModalContextValue | null>(null);

export function useSearchModal() {
  return useContext(SearchModalContext);
}

interface ShellPageConfig {
  title?: ReactNode;
  active: ProductShellActive;
  wide: boolean;
  hideHeader: boolean;
  searchQuery: string;
  backHref?: string;
  backLabel: string;
  documentTitle?: string;
}

interface PersistentChromeContextValue {
  setPageConfig: (cfg: ShellPageConfig) => void;
}

const PersistentChromeContext =
  createContext<PersistentChromeContextValue | null>(null);

const destinations = [
  { label: "Beranda", icon: Home, href: "/home" },
  { label: "Jelajah", icon: Search, href: "/explore" },
  { label: "Obrolan", icon: MessagesSquare, href: "/messages" },
  { label: "Notifikasi", icon: Bell, href: "/notifications" },
  { label: "Laporan", icon: Archive, href: "/laporan" },
];

function inferActiveFromPathname(pathname: string): ProductShellActive {
  if (pathname.startsWith("/explore")) return "explore";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/laporan") || pathname.startsWith("/timeline"))
    return "laporan";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/tugas") || pathname.startsWith("/agency"))
    return "tugas";
  if (
    pathname.startsWith("/settings") ||
    pathname.startsWith("/verification") ||
    pathname.startsWith("/activity")
  )
    return "settings";
  return "home";
}

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/recovery") ||
    pathname.startsWith("/help")
  );
}

/**
 * Mounted ONCE at RootLayout so Sidebar & Support Column never unmount/re-render across route changes.
 */
export function PersistentProductChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const {
    people,
    user,
    isHydrating,
    following,
    setFollowing,
    logout,
    showToast,
  } = useDemo();

  const [pageConfig, setPageConfigState] = useState<ShellPageConfig>(() => ({
    active: inferActiveFromPathname(pathname),
    wide: pathname.startsWith("/messages"),
    hideHeader: true,
    searchQuery: "",
    backLabel: "Kembali",
  }));

  const setPageConfig = useCallback((cfg: ShellPageConfig) => {
    setPageConfigState((prev) => {
      if (
        prev.active === cfg.active &&
        prev.wide === cfg.wide &&
        prev.hideHeader === cfg.hideHeader &&
        prev.searchQuery === cfg.searchQuery &&
        prev.backHref === cfg.backHref &&
        prev.backLabel === cfg.backLabel &&
        prev.documentTitle === cfg.documentTitle &&
        prev.title === cfg.title
      ) {
        return prev;
      }
      return cfg;
    });
  }, []);

  const [composerMode, setComposerMode] = useState<"post" | "report" | null>(
    null,
  );
  const [searchModal, setSearchModal] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileAccountMenuOpen, setMobileAccountMenuOpen] = useState(false);
  const [mobileCreateOpen, setMobileCreateOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileAccountMenuRef = useRef<HTMLDivElement>(null);
  const mobileCreateRef = useRef<HTMLDivElement>(null);

  const publicView = isPublicRoute(pathname);

  useEffect(() => {
    if (!publicView && !isHydrating && !user) {
      router.replace("/login");
    }
  }, [publicView, isHydrating, user, router]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModal((prev) => !prev);
      }
      if (e.key === "Escape") {
        setAccountMenuOpen(false);
        setMobileAccountMenuOpen(false);
        setMobileCreateOpen(false);
      }
    }
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
      if (
        mobileAccountMenuRef.current &&
        !mobileAccountMenuRef.current.contains(target)
      ) {
        setMobileAccountMenuOpen(false);
      }
      if (
        mobileCreateRef.current &&
        !mobileCreateRef.current.contains(target)
      ) {
        setMobileCreateOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleNavClick(
    event: ReactMouseEvent<HTMLAnchorElement>,
    href: string,
    afterAllow?: () => void,
  ) {
    if (!consumePageSwitchSlot(pathname, href)) {
      event.preventDefault();
      afterAllow?.();
      showToast("Tunggu 1 detik sebelum pindah halaman.", "info");
      return;
    }
    afterAllow?.();
  }

  const active = pageConfig.active || inferActiveFromPathname(pathname);
  const wide = pageConfig.wide || pathname.startsWith("/messages");
  const trimmedSearchQuery = pageConfig.searchQuery.trim();
  const hasActiveSearch = Boolean(trimmedSearchQuery);
  const showRightSidebar =
    (active === "home" || active === "explore") &&
    (pathname.startsWith("/home") || pathname.startsWith("/explore"));

  const mobileTitle =
    typeof pageConfig.title === "string" && pageConfig.title.trim()
      ? pageConfig.title
      : active === "home"
        ? "Beranda"
        : active === "explore"
          ? "Jelajah"
          : active === "messages"
            ? "Obrolan"
            : active === "notifications"
              ? "Notifikasi"
              : active === "laporan" || active === "timeline"
                ? "Laporan"
                : active === "profile"
                  ? "Profil"
                  : active === "tugas" || active === "agency"
                    ? "Tugas"
                    : active === "settings"
                      ? "Pengaturan"
                      : "Kavi";

  const suggestedPeople = useMemo(() => {
    return people
      .filter(
        (person) =>
          person.localKey !== user?.localKey &&
          person.localKey !== "zaky_internal",
      )
      .sort((a, b) => {
        const priority = [
          "pupr",
          "komunitas",
          "dishub",
          "pemprov_jabar",
          "nadia",
        ];
        const idxA = priority.indexOf(a.localKey);
        const idxB = priority.indexOf(b.localKey);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (
          (b.role === "GOVERNMENT" ? 1 : 0) - (a.role === "GOVERNMENT" ? 1 : 0)
        );
      })
      .slice(0, 4);
  }, [people, user?.localKey]);

  const searchModalValue = useMemo(
    () => ({
      openSearch: () => setSearchModal(true),
      query: trimmedSearchQuery,
    }),
    [trimmedSearchQuery],
  );

  const chromeCtxValue = useMemo(() => ({ setPageConfig }), [setPageConfig]);

  if (publicView) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return (
    <PersistentChromeContext.Provider value={chromeCtxValue}>
      <SearchModalContext.Provider value={searchModalValue}>
        <div
          className={`product ${wide ? "product--messages" : ""} ${!showRightSidebar ? "product--no-support" : ""} ${hasActiveSearch ? "product--search-active" : ""}`.trim()}
        >
          <a className="skip-link" href="#main-content">
            Lewati navigasi
          </a>
          <aside className="sidebar">
            <div className="sidebar-center">
              <Link
                href="/home"
                className="wordmark"
                aria-label="Kavi Beranda"
                onClick={(e) => handleNavClick(e, "/home")}
              >
                <Image
                  src="/kavi.png"
                  alt="Kavi"
                  width={72}
                  height={72}
                  className="wordmark-img"
                  preload
                />
              </Link>
              <nav aria-label="Navigasi utama">
                {destinations.map(({ label, icon: Icon, href }, index) =>
                  href ? (
                    <Link
                      key={label}
                      aria-label={label}
                      href={href}
                      aria-current={
                        href === `/${active === "timeline" ? "laporan" : active}`
                          ? "page"
                          : undefined
                      }
                      className={`nav-item ${href === `/${active === "timeline" ? "laporan" : active}` ? "active" : ""} nav-group-${index}`}
                      onClick={(e) => handleNavClick(e, href)}
                    >
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  ) : null,
                )}
                {(user.role === "GOVERNMENT" || user.role === "INTERNAL") && (
                  <Link
                    className={`nav-item ${active === "tugas" || active === "agency" ? "active" : ""}`}
                    href="/tugas"
                    aria-label="Tugas"
                    aria-current={
                      active === "tugas" || active === "agency"
                        ? "page"
                        : undefined
                    }
                    onClick={(e) => handleNavClick(e, "/tugas")}
                  >
                    <FileExclamationPoint />
                    <span>Tugas</span>
                  </Link>
                )}
              </nav>
              <CreateDropdown onSelectOption={(m) => setComposerMode(m)} />
            </div>
            <div className="sidebar-account-wrapper" ref={accountMenuRef}>
              {accountMenuOpen && (
                <div
                  className="sidebar-account-menu"
                  role="menu"
                  aria-label="Menu akun"
                >
                  <Link
                    href="/profile/@me"
                    role="menuitem"
                    className="sidebar-account-menu-item"
                    onClick={(e) =>
                      handleNavClick(e, "/profile/@me", () =>
                        setAccountMenuOpen(false),
                      )
                    }
                  >
                    <UserRound size={18} strokeWidth={1.8} />
                    <span>Profil</span>
                  </Link>
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="sidebar-account-menu-item"
                    onClick={(e) =>
                      handleNavClick(e, "/settings", () =>
                        setAccountMenuOpen(false),
                      )
                    }
                  >
                    <Settings size={18} strokeWidth={1.8} />
                    <span>Pengaturan</span>
                  </Link>
                  <div className="sidebar-account-menu-divider" />
                  <button
                    type="button"
                    role="menuitem"
                    className="sidebar-account-menu-item sidebar-account-menu-item--danger"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logout();
                      router.push("/login");
                    }}
                  >
                    <LogOut size={18} strokeWidth={1.8} />
                    <span>Keluar</span>
                  </button>
                </div>
              )}

              <div className="sidebar-account">
                <Link
                  href="/profile/@me"
                  className={`sidebar-account-main ${active === "profile" ? "active" : ""}`}
                  aria-label="Profil"
                  aria-current={active === "profile" ? "page" : undefined}
                  onClick={(e) => {
                    const isCompactSidebar =
                      wide ||
                      (typeof window !== "undefined" &&
                        window.matchMedia("(max-width: 1250px)").matches);
                    if (isCompactSidebar) {
                      e.preventDefault();
                      setAccountMenuOpen((prev) => !prev);
                      return;
                    }
                    handleNavClick(e, "/profile/@me");
                  }}
                >
                  <Avatar name={user.name} src={user.image} />
                  <div className="sidebar-account-info">
                    <strong className="sidebar-account-name">{user.name}</strong>
                    <span className="sidebar-account-handle">
                      @{user.username}
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  className={`sidebar-account-more ${accountMenuOpen ? "active" : ""}`}
                  aria-label="Menu akun"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                >
                  <MoreHorizontal size={20} strokeWidth={2} />
                </button>
              </div>
            </div>
          </aside>

          <div className="product-workspace">
            <header className="mobile-topbar">
              <div className="mobile-topbar-left">
                {pageConfig.backHref ? (
                  <Link
                    href={pageConfig.backHref}
                    className="mobile-topbar-back"
                    aria-label={pageConfig.backLabel}
                    onClick={(e) => handleNavClick(e, pageConfig.backHref!)}
                  >
                    <ArrowLeft size={20} strokeWidth={2} />
                  </Link>
                ) : (
                  <Link
                    href="/home"
                    className="mobile-topbar-logo"
                    aria-label="Kavi Beranda"
                    onClick={(e) => handleNavClick(e, "/home")}
                  >
                    <Image
                      src="/kavi.png"
                      alt="Kavi"
                      width={56}
                      height={56}
                      className="mobile-topbar-logo-img"
                      preload
                    />
                  </Link>
                )}
                <h1 className="mobile-topbar-title">{mobileTitle}</h1>
              </div>

              <div className="mobile-topbar-right">
                <Link
                  href="/notifications"
                  className={`mobile-topbar-bell ${active === "notifications" ? "active" : ""}`}
                  aria-label="Notifikasi"
                  aria-current={active === "notifications" ? "page" : undefined}
                  onClick={(e) => handleNavClick(e, "/notifications")}
                >
                  <Bell size={22} strokeWidth={1.9} />
                </Link>

                <div
                  className="mobile-profile-menu-wrap"
                  ref={mobileAccountMenuRef}
                >
                  <button
                    type="button"
                    className="mobile-topbar-avatar-btn"
                    aria-label="Menu akun"
                    aria-expanded={mobileAccountMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => setMobileAccountMenuOpen((prev) => !prev)}
                  >
                    <Avatar name={user.name} src={user.image} />
                    <span className="mobile-avatar-caret" aria-hidden="true">
                      <ChevronDown size={11} strokeWidth={2.5} />
                    </span>
                  </button>

                  {mobileAccountMenuOpen && (
                    <div
                      className="sidebar-account-menu mobile-account-menu"
                      role="menu"
                      aria-label="Menu akun"
                    >
                      <Link
                        href="/profile/@me"
                        role="menuitem"
                        className="sidebar-account-menu-item"
                        onClick={(e) =>
                          handleNavClick(e, "/profile/@me", () =>
                            setMobileAccountMenuOpen(false),
                          )
                        }
                      >
                        <UserRound size={18} strokeWidth={1.8} />
                        <span>Profil</span>
                      </Link>
                      <Link
                        href="/settings"
                        role="menuitem"
                        className="sidebar-account-menu-item"
                        onClick={(e) =>
                          handleNavClick(e, "/settings", () =>
                            setMobileAccountMenuOpen(false),
                          )
                        }
                      >
                        <Settings size={18} strokeWidth={1.8} />
                        <span>Pengaturan</span>
                      </Link>
                      {(user.role === "GOVERNMENT" ||
                        user.role === "INTERNAL") && (
                        <Link
                          href="/tugas"
                          role="menuitem"
                          className="sidebar-account-menu-item"
                          onClick={(e) =>
                            handleNavClick(e, "/tugas", () =>
                              setMobileAccountMenuOpen(false),
                            )
                          }
                        >
                          <FileExclamationPoint size={18} strokeWidth={1.8} />
                          <span>Tugas</span>
                        </Link>
                      )}
                      <div className="sidebar-account-menu-divider" />
                      <button
                        type="button"
                        role="menuitem"
                        className="sidebar-account-menu-item sidebar-account-menu-item--danger"
                        onClick={() => {
                          setMobileAccountMenuOpen(false);
                          logout();
                          router.push("/login");
                        }}
                      >
                        <LogOut size={18} strokeWidth={1.8} />
                        <span>Keluar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {children}
          </div>

          <aside
            className="support-column"
            style={showRightSidebar ? undefined : { display: "none" }}
          >
            {!hasActiveSearch && (
              <div className="support-search-wrapper">
                <SearchTriggerButton onClick={() => setSearchModal(true)} />
              </div>
            )}

            <HighlightSection />

            <section className="suggestions">
              <h2>Temukan suara baru</h2>
              {suggestedPeople.map((person) => (
                <div className="suggestion" key={person.localKey}>
                  <Avatar name={person.name} src={person.image} />
                  <div>
                    <strong>
                      <Link
                        href={`/profile/${person.localKey}`}
                        onClick={(e) =>
                          handleNavClick(e, `/profile/${person.localKey}`)
                        }
                      >
                        {person.name}
                      </Link>
                      <VerifiedBadge role={person.role} size={15} />
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
              <Link
                href="/settings"
                onClick={(e) => handleNavClick(e, "/settings")}
              >
                Pengaturan
              </Link>{" "}
              ·{" "}
              <Link href="/help" onClick={(e) => handleNavClick(e, "/help")}>
                Bantuan
              </Link>
              <br />
              Kavi · Ruang bersama untuk perubahan.
              <br />© 2026 Kavi · Hak cipta dilindungi.
            </p>
          </aside>

          <nav className="mobile-island" aria-label="Navigasi seluler">
            <Link
              href="/home"
              aria-label="Beranda"
              aria-current={active === "home" ? "page" : undefined}
              className={active === "home" ? "active" : ""}
              onClick={(e) => handleNavClick(e, "/home")}
            >
              <Home />
            </Link>
            <Link
              href="/explore"
              aria-label="Jelajah"
              aria-current={active === "explore" ? "page" : undefined}
              className={active === "explore" ? "active" : ""}
              onClick={(e) => handleNavClick(e, "/explore")}
            >
              <Search />
            </Link>
            <div className="mobile-island-create" ref={mobileCreateRef}>
              <button
                type="button"
                className="island-compose"
                aria-label="Buat postingan atau laporan"
                aria-expanded={mobileCreateOpen}
                onClick={() => setMobileCreateOpen((prev) => !prev)}
              >
                <Plus />
              </button>
              {mobileCreateOpen && (
                <div className="create-dropdown-popover mobile-island-popover">
                  <button
                    type="button"
                    className="create-dropdown-item"
                    onClick={() => {
                      setMobileCreateOpen(false);
                      setComposerMode("post");
                    }}
                  >
                    <PenSquare
                      size={17}
                      strokeWidth={1.8}
                      className="create-dropdown-icon"
                    />
                    <span>Postingan</span>
                  </button>
                  <button
                    type="button"
                    className="create-dropdown-item"
                    onClick={() => {
                      setMobileCreateOpen(false);
                      setComposerMode("report");
                    }}
                  >
                    <Megaphone
                      size={17}
                      strokeWidth={1.8}
                      className="create-dropdown-icon"
                    />
                    <span>Lapor</span>
                  </button>
                </div>
              )}
            </div>
            <Link
              href="/messages"
              aria-label="Obrolan"
              aria-current={active === "messages" ? "page" : undefined}
              className={active === "messages" ? "active" : ""}
              onClick={(e) => handleNavClick(e, "/messages")}
            >
              <MessagesSquare />
            </Link>
            <Link
              href="/laporan"
              aria-label="Laporan"
              aria-current={
                active === "laporan" || active === "timeline"
                  ? "page"
                  : undefined
              }
              className={
                active === "laporan" || active === "timeline" ? "active" : ""
              }
              onClick={(e) => handleNavClick(e, "/laporan")}
            >
              <Archive />
            </Link>
          </nav>

          {composerMode && (
            <Composer
              initialMode={composerMode}
              onClose={() => setComposerMode(null)}
            />
          )}
          <QuickSearchModal
            isOpen={searchModal}
            initialQuery={trimmedSearchQuery}
            onClose={() => setSearchModal(false)}
          />
        </div>
      </SearchModalContext.Provider>
    </PersistentChromeContext.Provider>
  );
}

export function ProductShell({
  title,
  children,
  active = "home",
  wide = false,
  hideHeader = false,
  searchQuery = "",
  backHref,
  backLabel = "Kembali",
  documentTitle,
}: {
  title?: ReactNode;
  children: ReactNode;
  active?: ProductShellActive;
  wide?: boolean;
  hideHeader?: boolean;
  searchQuery?: string;
  backHref?: string;
  backLabel?: string;
  documentTitle?: string;
}) {
  const chrome = useContext(PersistentChromeContext);
  const { user, showToast } = useDemo();
  const pathname = usePathname() || "/";
  const [routePathname] = useState(pathname);
  const contentRef = useRef<HTMLElement>(null);

  const trimmedSearchQuery = searchQuery.trim();
  const mobileTitle =
    typeof title === "string" && title.trim()
      ? title
      : active === "home"
        ? "Beranda"
        : active === "explore"
          ? "Jelajah"
          : active === "messages"
            ? "Obrolan"
            : active === "notifications"
              ? "Notifikasi"
              : active === "laporan" || active === "timeline"
                ? "Laporan"
                : active === "profile"
                  ? "Profil"
                  : active === "tugas" || active === "agency"
                    ? "Tugas"
                    : active === "settings"
                      ? "Pengaturan"
                      : "Kavi";

  const resolvedDocTitle =
    documentTitle ??
    (active === "explore" && trimmedSearchQuery
      ? formatSearchTitle(trimmedSearchQuery)
      : formatPageTitle(mobileTitle));

  useBrowserLayoutEffect(() => {
    chrome?.setPageConfig({
      title,
      active,
      wide,
      hideHeader,
      searchQuery,
      backHref,
      backLabel,
      documentTitle,
    });
  }, [
    chrome,
    title,
    active,
    wide,
    hideHeader,
    searchQuery,
    backHref,
    backLabel,
    documentTitle,
  ]);

  useBrowserLayoutEffect(() => {
    if (!user) return;
    if (pathname !== routePathname) return;
    const el = contentRef.current;
    if (el && window.getComputedStyle(el).display === "none") return;

    const ownerToken = ++activeDocTitleToken;
    const syncTitle = () => {
      if (activeDocTitleToken !== ownerToken) return;
      if (el && window.getComputedStyle(el).display === "none") return;
      if (document.title !== resolvedDocTitle) {
        document.title = resolvedDocTitle;
      }
    };
    syncTitle();
    const observer = new MutationObserver(syncTitle);
    observer.observe(document.head, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [user, resolvedDocTitle, pathname, routePathname]);

  function handleNavClick(
    event: ReactMouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    if (!consumePageSwitchSlot(pathname, href)) {
      event.preventDefault();
      showToast("Tunggu 1 detik sebelum pindah halaman.", "info");
    }
  }

  return (
    <>
      {!hideHeader && title && (
        <header className="page-header">
          {typeof title === "string" ? <h1>{title}</h1> : title}
          <div className="page-header-actions">
            <Link
              className="button button--ghost mobile-bell"
              href="/notifications"
              aria-label="Notifikasi"
              onClick={(e) => handleNavClick(e, "/notifications")}
            >
              <Bell />
            </Link>
          </div>
        </header>
      )}
      <main id="main-content" ref={contentRef} className="reading-column">
        {children}
      </main>
    </>
  );
}
