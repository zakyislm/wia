"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectMenuOption<T extends string = string> {
  value: T;
  label: string;
}

/** Custom accessible dropdown popover matching KAVI's rounded card menu style. */
export function SelectMenu<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  align = "right",
  fullWidth = false,
}: {
  value: T;
  options: readonly SelectMenuOption<T>[];
  onChange: (nextValue: T) => void;
  ariaLabel?: string;
  align?: "left" | "right";
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`select-menu ${fullWidth ? "select-menu--full" : ""}`.trim()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`select-menu-trigger ${fullWidth ? "select-menu-trigger--full" : ""} ${open ? "is-open" : ""}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="select-menu-value">{selectedOption?.label}</span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={`select-menu-chevron ${open ? "is-open" : ""}`.trim()}
        />
      </button>

      {open && (
        <div
          className={`select-menu-popover ${align === "left" ? "select-menu-popover--left" : "select-menu-popover--right"} ${fullWidth ? "select-menu-popover--full" : ""}`.trim()}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`select-menu-option ${isSelected ? "is-selected" : ""}`.trim()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={15} strokeWidth={2.2} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
