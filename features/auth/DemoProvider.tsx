"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { people as seedPeople, seedPosts } from "@/mocks/data";
import { seedWorkspace } from "@/features/workspace/state";
import type { Person, Post } from "@/types/models";

function useDemoState() {
  const [workspace, setWorkspace] = useState(seedWorkspace);
  const [people, setPeople] = useState<Person[]>(seedPeople);
  const feedScroll = useRef(0);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  useEffect(() => {
    setPosts(seedPosts(Date.now()));
  }, []);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [following, setFollowing] = useState<string[]>([]);
  const user = people.find((person) => person.localKey === userKey);
  function login(key: string) {
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
  };
}
const DemoContext = createContext<ReturnType<typeof useDemoState> | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const state = useDemoState();
  return <DemoContext.Provider value={state}>{children}</DemoContext.Provider>;
}
export function useDemo() {
  const state = useContext(DemoContext);
  if (!state) throw new Error("DemoProvider is missing");
  return state;
}
