"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export function Dialog({
  title,
  children,
  onClose,
  hideHeader = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  hideHeader?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`.trim()}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {!hideHeader && (
        <header className="dialog-header">
          <h2 id="dialog-title">{title}</h2>
          <Button variant="ghost" aria-label="Tutup dialog" onClick={onClose}>
            <X />
          </Button>
        </header>
      )}
      {children}
    </dialog>
  );
}
