"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type SetStateAction,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { seedWorkspace, type Workspace } from "@/features/workspace/state";
import { resetPageSwitchCooldown } from "@/lib/navigationGuard";
import type { Person, Post, Topic } from "@/types/models";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface DbNotificationItem {
  key: string;
  actorKey?: string;
  actorName?: string;
  actorImage?: string;
  title: string;
  body: string;
  href: string;
  createdAt: number;
  isRead: boolean;
}

const TOAST_DURATION_MS = 3000;
const DEMO_KEYS = new Set(["alya", "pupr", "zaky_internal", "nadia", "dishub", "pemprov_jabar", "komunitas"]);

function useDemoState() {
  const [workspace, setWorkspaceState] = useState<Workspace>(seedWorkspace);
  const [people, setPeopleState] = useState<Person[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const feedScroll = useRef(0);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [posts, setPostsState] = useState<Post[]>([]);
  const [dbNotifications, setDbNotifications] = useState<DbNotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dbPeopleRef = useRef<Person[]>([]);
  const dbPostsRef = useRef<Post[]>([]);

  const [userKey, setUserKey] = useState<string | null>(() => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)kavi_uid=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const [isDemoAccount, setIsDemoAccount] = useState<boolean>(true);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [following, setFollowingState] = useState<string[]>([]);
  const [sessionUserFallback, setSessionUserFallback] = useState<Person | undefined>(undefined);
  const fallbackQuickUser: Person | undefined =
    userKey === "alya"
      ? {
          id: "",
          localKey: "alya",
          name: "Alya Putri",
          username: "alyaputri",
          role: "USER",
          bio: "",
          isDemo: true,
        }
      : userKey === "pupr"
        ? {
            id: "",
            localKey: "pupr",
            name: "Dinas PUPR Bandung",
            username: "pupr_bdg",
            role: "GOVERNMENT",
            bio: "",
            isDemo: true,
          }
        : userKey === "zaky_internal"
          ? {
              id: "",
              localKey: "zaky_internal",
              name: "Zaky The Flymost",
              username: "zaky_internal",
              role: "INTERNAL",
              bio: "",
              isDemo: true,
            }
          : sessionUserFallback?.localKey === userKey
            ? sessionUserFallback
            : undefined;
  const user =
    people.find((person) => person.localKey === userKey) ?? fallbackQuickUser;

  // Hydrate live 54-user, 50-post dataset & active session from Turso DB on mount
  useEffect(() => {
    let active = true;

    async function hydrateFromTurso() {
      try {
        const res = await fetch("/api/bootstrap", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.data;
        if (!active || !data) return;

        if (Array.isArray(data.topics)) {
          setTopics(data.topics);
        }

        if (Array.isArray(data.people) && data.people.length > 0) {
          dbPeopleRef.current = data.people;
          setPeopleState((current) => {
            const byKey = new Map<string, Person>();
            for (const p of data.people) byKey.set(p.localKey, p);
            for (const p of current) {
              if (!byKey.has(p.localKey)) byKey.set(p.localKey, p);
            }
            return Array.from(byKey.values());
          });
        }

        if (Array.isArray(data.posts) && data.posts.length > 0) {
          dbPostsRef.current = data.posts;
          setPostsState((current) => {
            // Preserve any newly created in-session posts not yet in DB snapshot
            const dbKeys = new Set(data.posts.map((p: Post) => p.localKey));
            const sessionOnly = current.filter(
              (p) =>
                !dbKeys.has(p.localKey) &&
                Date.now() - p.postedAt < 60_000,
            );
            return [...sessionOnly, ...data.posts];
          });
        }

        if (Array.isArray(data.dbNotifications)) {
          setDbNotifications(data.dbNotifications);
        }

        // Restore active session (persists across page refreshes until explicit logout)
        if (data.currentUser) {
          setUserKey(data.currentUser.localKey);
          setIsDemoAccount(Boolean(data.currentUser.isDemo));
          setSessionUserFallback({
            id: "",
            localKey: data.currentUser.localKey,
            name: data.currentUser.name,
            username: data.currentUser.username,
            role: data.currentUser.role || "USER",
            bio: "",
            image: data.currentUser.image,
            isDemo: Boolean(data.currentUser.isDemo),
          });
          if (data.currentUser.image) {
            setPeopleState((current) =>
              current.map((p) =>
                p.localKey === data.currentUser.localKey
                  ? { ...p, image: data.currentUser.image }
                  : p
              )
            );
          }
          if (Array.isArray(data.following)) {
            setFollowingState(data.following);
          }
          if (data.workspace) {
            setWorkspaceState(data.workspace);
          }
        }
      } catch {
        // Ignore network errors
      } finally {
        if (active) setIsHydrating(false);
      }
    }

    void hydrateFromTurso();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-2), { id, message, variant }]);
      const timer = setTimeout(() => {
        toastTimersRef.current.delete(id);
        setToasts((current) => current.filter((item) => item.id !== id));
      }, TOAST_DURATION_MS);
      toastTimersRef.current.set(id, timer);
    },
    [],
  );

  // Demo sandbox login (hydrates from Turso DB, never writes mutations back to DB; resets on page refresh)
  function login(key: string) {
    resetPageSwitchCooldown();
    if (typeof document !== "undefined") {
      document.cookie = `kavi_uid=${encodeURIComponent(key)}; path=/; max-age=2592000; samesite=lax`;
    }
    void fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: key }),
    }).catch(() => {});
    if (dbPeopleRef.current.length > 0) {
      setPeopleState(dbPeopleRef.current);
    }
    feedScroll.current = 0;
    setUserKey(key);
    setIsDemoAccount(true);
    setIsHydrating(false);
    if (dbPostsRef.current.length > 0) {
      setPostsState(structuredClone(dbPostsRef.current));
    }
    setFollowingState([]);
    setWorkspaceState(seedWorkspace());

    void fetch(`/api/bootstrap?userKey=${encodeURIComponent(key)}`, {
      credentials: "same-origin",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const data = json?.data;
        if (!data) return;
        if (Array.isArray(data.topics)) setTopics(data.topics);
        if (Array.isArray(data.people) && data.people.length > 0) {
          dbPeopleRef.current = data.people;
          setPeopleState(data.people);
        }
        if (Array.isArray(data.posts) && data.posts.length > 0) {
          dbPostsRef.current = data.posts;
          setPostsState(structuredClone(data.posts));
        }
        if (Array.isArray(data.following)) setFollowingState(data.following);
        if (data.workspace) setWorkspaceState(data.workspace);
        if (Array.isArray(data.dbNotifications))
          setDbNotifications(data.dbNotifications);
      })
      .catch(() => {});
  }

  // Real DB account login (persists mutations to Turso DB)
  async function loginReal(accountData: {
    id: string;
    name: string;
    username: string;
    role?: "USER" | "GOVERNMENT" | "INTERNAL";
    bio?: string | null;
    region?: string | null;
    image?: string | null;
  }) {
    resetPageSwitchCooldown();
    const person: Person = {
      id: "",
      localKey: accountData.id,
      name: accountData.name,
      username: accountData.username,
      role: accountData.role || "USER",
      bio: accountData.bio || "",
      region: accountData.region || undefined,
      image: accountData.image || undefined,
    };
    setPeopleState((current) => {
      const exists = current.some((p) => p.localKey === person.localKey);
      return exists
        ? current.map((p) => (p.localKey === person.localKey ? person : p))
        : [...current, person];
    });
    feedScroll.current = 0;
    setUserKey(person.localKey);
    setIsDemoAccount(false);
    setIsHydrating(false);

    try {
      const res = await fetch(
        `/api/bootstrap?userKey=${encodeURIComponent(person.localKey)}`,
        { credentials: "same-origin" },
      );
      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        if (data) {
          if (Array.isArray(data.topics)) setTopics(data.topics);
          if (Array.isArray(data.people)) setPeopleState(data.people);
          if (Array.isArray(data.posts)) setPostsState(data.posts);
          if (Array.isArray(data.following)) setFollowingState(data.following);
          if (data.workspace) setWorkspaceState(data.workspace);
          if (Array.isArray(data.dbNotifications))
            setDbNotifications(data.dbNotifications);
        }
      }
    } catch {
      // Ignore network errors
    }
  }

  function logout() {
    resetPageSwitchCooldown();
    if (typeof document !== "undefined") {
      document.cookie = "kavi_uid=; path=/; max-age=0; samesite=lax";
    }
    void fetch("/api/auth/login", { method: "DELETE" }).catch(() => {});
    void signOut({ redirect: false }).catch(() => {});
    setPeopleState(dbPeopleRef.current);
    feedScroll.current = 0;
    setUserKey(null);
    setSessionUserFallback(undefined);
    setIsDemoAccount(true);
    setPostsState([]);
    setFollowingState([]);
    setWorkspaceState(seedWorkspace());
  }

  function register(
    name: string,
    username: string,
    email?: string,
    password?: string,
  ) {
    resetPageSwitchCooldown();
    const localKey = `usr_${username.toLowerCase()}_${Date.now().toString(36)}`;
    const person: Person = {
      id: "",
      localKey,
      name,
      username,
      role: "USER",
      bio: "",
    };
    setPeopleState([...dbPeopleRef.current, person]);
    setUserKey(person.localKey);
    setIsDemoAccount(!email);
    setPostsState(structuredClone(dbPostsRef.current));
    setFollowingState([]);
    setWorkspaceState(seedWorkspace());

    if (email && password) {
      void fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res?.success && res?.data?.id) {
            void loginReal(res.data);
          }
        })
        .catch(() => {});
    }
  }

  const setPosts = useCallback(
    (action: SetStateAction<Post[]>) => {
      setPostsState((current) => {
        const next = typeof action === "function" ? action(current) : action;
        if (!isDemoAccount && userKey && !DEMO_KEYS.has(userKey)) {
          // Detect newly created root post
          if (next.length > current.length) {
            const currentKeys = new Set(current.map((p) => p.localKey));
            const added = next.find((p) => !currentKeys.has(p.localKey));
            if (added) {
              void fetch("/api/posts", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": userKey,
                },
                body: JSON.stringify({
                  id: added.localKey,
                  kind: added.kind,
                  topicId: added.topicId,
                  category: added.category,
                  title: added.content.slice(0, 72),
                  content: added.content,
                  province: added.province,
                  locationName: added.locationName || added.province,
                  tags: added.tags || [],
                  agencyKeys: added.agencyKeys || [],
                  images: added.images || [],
                  isAnonymous: added.anonymous,
                }),
              }).catch(() => {});
            }
          }
        }
        return next;
      });
    },
    [isDemoAccount, userKey],
  );

  function updatePost(key: string, update: (post: Post) => Post) {
    setPostsState((current) =>
      current.map((post) => {
        if (post.localKey !== key) return post;
        const next = update(post);

        if (!isDemoAccount && userKey && !DEMO_KEYS.has(userKey)) {
          const headers = {
            "Content-Type": "application/json",
            "x-user-id": userKey,
          };
          if (next.vote !== post.vote) {
            const voteType = next.vote || post.vote || "UP";
            void fetch(`/api/posts/${encodeURIComponent(key)}/vote`, {
              method: "POST",
              headers,
              body: JSON.stringify({ voteType }),
            }).catch(() => {});
          }
          if (next.saved !== post.saved) {
            void fetch(`/api/posts/${encodeURIComponent(key)}/save`, {
              method: "POST",
              headers,
            }).catch(() => {});
          }
          if (next.reposted !== post.reposted) {
            void fetch(`/api/posts/${encodeURIComponent(key)}/repost`, {
              method: "POST",
              headers,
            }).catch(() => {});
          }
          if (next.isDeleted && !post.isDeleted) {
            void fetch(`/api/posts/${encodeURIComponent(key)}`, {
              method: "DELETE",
              headers,
            }).catch(() => {});
          }
          if (next.replies.length > post.replies.length) {
            const newReply = next.replies[next.replies.length - 1];
            if (newReply) {
              void fetch(`/api/posts/${encodeURIComponent(key)}/comments`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  id: newReply.localKey,
                  content: newReply.content,
                  parentId: newReply.parentKey || null,
                  images: newReply.images || [],
                  location: newReply.location || null,
                  isActionTaken: Boolean(newReply.is_action_taken),
                  isAnonymous: Boolean(newReply.anonymous),
                }),
              }).catch(() => {});
            }
          }
        }

        return next;
      }),
    );
  }

  const setPeople = useCallback(
    (action: SetStateAction<Person[]>) => {
      setPeopleState((current) => {
        const next = typeof action === "function" ? action(current) : action;
        if (!isDemoAccount && userKey && !DEMO_KEYS.has(userKey)) {
          const prevSelf = current.find((p) => p.localKey === userKey);
          const nextSelf = next.find((p) => p.localKey === userKey);
          if (
            prevSelf &&
            nextSelf &&
            (prevSelf.name !== nextSelf.name ||
              prevSelf.bio !== nextSelf.bio ||
              prevSelf.region !== nextSelf.region ||
              prevSelf.image !== nextSelf.image)
          ) {
            void fetch("/api/users/me", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": userKey,
              },
              body: JSON.stringify({
                name: nextSelf.name,
                bio: nextSelf.bio,
                region: nextSelf.region || "",
                image:
                  nextSelf.image && !nextSelf.image.startsWith("blob:")
                    ? nextSelf.image
                    : nextSelf.image === undefined
                      ? ""
                      : undefined,
              }),
            }).catch(() => {});
          }
        }
        return next;
      });
    },
    [isDemoAccount, userKey],
  );

  const setFollowing = useCallback(
    (action: SetStateAction<string[]>) => {
      setFollowingState((current) => {
        const next = typeof action === "function" ? action(current) : action;
        if (!isDemoAccount && userKey && !DEMO_KEYS.has(userKey)) {
          const added = next.find((k) => !current.includes(k));
          const removed = current.find((k) => !next.includes(k));
          const changedKey = added || removed;
          if (changedKey) {
            void fetch(`/api/users/${encodeURIComponent(changedKey)}/follow`, {
              method: "POST",
              headers: { "x-user-id": userKey },
            }).catch(() => {});
          }
        }
        return next;
      });
    },
    [isDemoAccount, userKey],
  );

  const setWorkspace = useCallback(
    (action: SetStateAction<Workspace>) => {
      setWorkspaceState((current) => {
        const next = typeof action === "function" ? action(current) : action;
        if (!isDemoAccount && userKey && !DEMO_KEYS.has(userKey)) {
          const headers = {
            "Content-Type": "application/json",
            "x-user-id": userKey,
          };
          if (
            next.notificationSocial !== current.notificationSocial ||
            next.notificationReports !== current.notificationReports ||
            next.notificationMessages !== current.notificationMessages
          ) {
            void fetch("/api/preferences", {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                notifyTagResponses: next.notificationSocial,
                notifyResolvedReports: next.notificationReports,
                notifyDirectMessages: next.notificationMessages,
              }),
            }).catch(() => {});
          }
          if (
            next.verification.status === "submitted" &&
            current.verification.status !== "submitted"
          ) {
            void fetch("/api/verification", {
              method: "POST",
              headers,
              body: JSON.stringify(next.verification),
            }).catch(() => {});
          }

          // Sync newly sent direct messages to Turso DB
          for (const nextConv of next.conversations) {
            const prevConv = current.conversations.find(
              (c) => c.localKey === nextConv.localKey,
            );
            const prevLen = prevConv?.messages.length ?? 0;
            if (nextConv.messages.length > prevLen) {
              const latestMsg = nextConv.messages[nextConv.messages.length - 1];
              if (latestMsg && latestMsg.outgoing) {
                void fetch("/api/messages", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    partnerId: nextConv.partnerKey,
                    text: latestMsg.text,
                    images: latestMsg.images || [],
                  }),
                }).catch(() => {});
              }
            }
          }
        }
        return next;
      });
    },
    [isDemoAccount, userKey],
  );

  return {
    workspace,
    setWorkspace,
    register,
    people,
    setPeople,
    topics,
    feedScroll,
    theme,
    setTheme,
    posts,
    setPosts,
    user,
    isDemoAccount,
    isHydrating,
    dbNotifications,
    login,
    loginReal,
    logout,
    updatePost,
    following,
    setFollowing,
    toasts,
    showToast,
    dismissToast,
  };
}

const DemoContext = createContext<ReturnType<typeof useDemoState> | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const state = useDemoState();
  return (
    <DemoContext.Provider value={state}>
      {children}
      {state.toasts.length > 0 && (
        <div
          className="toast-stack"
          aria-live="polite"
          aria-label="Notifikasi aksi"
        >
          {state.toasts.map((item) => (
            <div
              key={item.id}
              role={item.variant === "error" ? "alert" : "status"}
              className={`toast-item toast-item--${item.variant}`}
            >
              <span className="toast-icon" aria-hidden="true">
                {item.variant === "success" ? (
                  <CheckCircle2 size={16} strokeWidth={2.2} />
                ) : item.variant === "error" ? (
                  <AlertCircle size={16} strokeWidth={2.2} />
                ) : (
                  <Info size={16} strokeWidth={2.2} />
                )}
              </span>
              <span className="toast-message">{item.message}</span>
              <button
                type="button"
                className="toast-close"
                aria-label="Tutup notifikasi"
                onClick={() => state.dismissToast(item.id)}
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const state = useContext(DemoContext);
  if (!state) throw new Error("DemoProvider is missing");
  return state;
}
