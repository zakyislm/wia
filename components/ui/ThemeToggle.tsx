"use client";
import { Moon, Sun } from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { Button } from "./Button";
export function ThemeToggle() {
  const { theme, setTheme } = useDemo();
  return (
    <Button
      variant="ghost"
      aria-label="Ganti tema"
      onClick={() =>
        setTheme(
          theme === "dark" ||
            (theme === "system" &&
              window.matchMedia("(prefers-color-scheme: dark)").matches)
            ? "light"
            : "dark",
        )
      }
    >
      {theme === "dark" ? <Moon /> : <Sun />}
    </Button>
  );
}
