"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { people as seedPeople, seedPosts } from "@/mocks/data";
import { seedWorkspace } from "@/features/workspace/state";
import { resetPageSwitchCooldown } from "@/lib/navigationGuard";
import type { Person, Post } from "@/types/models";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

const TOAST_DURATION_MS = 3000;

function useDemoState() {
  const [workspace, setWorkspace] = useState(seedWorkspace);
  const [people, setPeople] = useState<Person[]>(seedPeople);
  const feedScroll = useRef(0);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    setPosts(seedPosts(Date.now()));
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

  const [userKey, setUserKey] = useState<string | null>(null);
  const [following, setFollowing] = useState<string[]>([]);
  const user = people.find((person) => person.localKey === userKey);
  function login(key: string) {
    resetPageSwitchCooldown();
    people.forEach((person) => {
      if (person.image) URL.revokeObjectURL(person.image);
    });
    setPeople(seedPeople);
    feedScroll.current = 0;
    setUserKey(key);
    setPosts(seedPosts());
    setFollowing([]);
    setWorkspace(seedWorkspace());
  }
  function logout() {
    resetPageSwitchCooldown();
    people.forEach((person) => {
      if (person.image) URL.revokeObjectURL(person.image);
    });
    setPeople(seedPeople);
    feedScroll.current = 0;
    posts
      .flatMap((post) => [
        ...post.images,
        ...post.resolutions.flatMap((item) => item.images),
      ])
      .forEach((url) => URL.revokeObjectURL(url));
    setUserKey(null);
    setPosts([]);
    setFollowing([]);
    setWorkspace(seedWorkspace());
  }
  function register(name: string, username: string) {
    resetPageSwitchCooldown();
    const person: Person = {
      id: "",
      localKey: crypto.randomUUID(),
      name,
      username,
      role: "USER",
      bio: "",
    };
    setPeople([...seedPeople, person]);
    setUserKey(person.localKey);
    setPosts(seedPosts());
    setFollowing([]);
    setWorkspace(seedWorkspace());
  }
  function updatePost(key: string, update: (post: Post) => Post) {
    setPosts((current) =>
      current.map((post) => (post.localKey === key ? update(post) : post)),
    );
  }
  return {
    workspace,
    setWorkspace,
    register,
    people,
    setPeople,
    feedScroll,
    theme,
    setTheme,
    posts,
    setPosts,
    user,
    login,
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
