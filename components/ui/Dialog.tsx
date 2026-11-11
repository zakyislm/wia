"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

let openDialogCount = 0;
let lockedScrollX = 0;
let lockedScrollY = 0;

export interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Check whether pointer coordinates fall strictly outside the modal card bounds. */
export function isPointOutsideRect(
  rect: RectLike,
  clientX: number,
  clientY: number,
): boolean {
  return (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  );
}

function lockMainScroll() {
  if (openDialogCount === 0) {
    const docEl = document.documentElement;
    const body = document.body;
    lockedScrollX = window.scrollX;
    lockedScrollY = window.scrollY;
    const hasVerticalOverflow = docEl.scrollHeight > window.innerHeight;

    docEl.classList.add("modal-scroll-locked");
    if (hasVerticalOverflow) {
      docEl.classList.add("modal-scroll-locked--preserve-scrollbar");
    }
    body.classList.add("modal-scroll-locked");
    body.style.top = `-${lockedScrollY}px`;
    if (lockedScrollX) {
      body.style.left = `-${lockedScrollX}px`;
    }
  }
  openDialogCount += 1;
}

function unlockMainScroll() {
  openDialogCount = Math.max(0, openDialogCount - 1);
  if (openDialogCount === 0) {
    const docEl = document.documentElement;
    const body = document.body;
    docEl.classList.remove(
      "modal-scroll-locked",
      "modal-scroll-locked--preserve-scrollbar",
    );
    body.classList.remove("modal-scroll-locked");
    body.style.top = "";
    body.style.left = "";
    window.scrollTo({
      top: lockedScrollY,
      left: lockedScrollX,
      behavior: "instant",
    });
  }
}

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
  const pointerStartedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    lockMainScroll();
    if (!dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog.open) {
        dialog.close();
      }
      unlockMainScroll();
      previous?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`.trim()}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onPointerDown={(event) => {
        const dialog = ref.current;
        pointerStartedOutsideRef.current =
          Boolean(dialog) &&
          event.target === dialog &&
          isPointOutsideRect(
            dialog!.getBoundingClientRect(),
            event.clientX,
            event.clientY,
          );
      }}
      onClick={(event) => {
        const dialog = ref.current;
        const shouldClose =
          Boolean(dialog) &&
          pointerStartedOutsideRef.current &&
          event.target === dialog &&
          isPointOutsideRect(
            dialog!.getBoundingClientRect(),
            event.clientX,
            event.clientY,
          );
        pointerStartedOutsideRef.current = false;
        if (shouldClose) {
          onClose();
        }
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
