import type { Metadata } from "next";
import { Feed } from "@/features/feed/Feed";

export const metadata: Metadata = { title: "Beranda" };

export default function HomePage() {
  return <Feed />;
}
