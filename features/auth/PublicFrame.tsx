"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useDemo } from "./DemoProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
export function PublicFrame({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const { theme } = useDemo();
  return (
    <div
      className={`public-surface ${theme === "dark" ? "theme-dark" : theme === "light" ? "theme-light" : "theme-system"}`}
    >
      <div className="public-theme">
        <ThemeToggle />
      </div>
      <main className="auth-page">
        <section className={`auth-card ${wide ? "auth-card-wide" : ""}`}>
          <Link className="wordmark" href="/login">
            kavi
          </Link>
          <h1>{title}</h1>
          {children}
          <footer className="public-footer">
            <Link href="/help#privacy">Privasi</Link> ·{" "}
            <Link href="/help#terms">Ketentuan</Link> ·{" "}
            <Link href="/help#community">Pedoman</Link>
          </footer>
        </section>
      </main>
    </div>
  );
}
