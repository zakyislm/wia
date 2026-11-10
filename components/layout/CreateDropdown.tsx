"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, PenSquare, Megaphone } from "lucide-react";

interface CreateDropdownProps {
  onSelectOption: (mode: "post" | "report") => void;
  isMobileFloating?: boolean;
}

export function CreateDropdown({
  onSelectOption,
  isMobileFloating = false,
}: CreateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function handleSelect(mode: "post" | "report") {
    setIsOpen(false);
    onSelectOption(mode);
  }

  if (isMobileFloating) {
    return (
      <div className="create-dropdown-wrapper mobile-floating" ref={dropdownRef}>
        <button
          type="button"
          className="floating-compose"
          aria-label="Buat postingan atau lapor"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <Plus size={24} />
        </button>

        {isOpen && (
          <div className="create-dropdown-popover mobile-popover">
            <button
              type="button"
              className="create-dropdown-item"
              onClick={() => handleSelect("post")}
            >
              <PenSquare size={17} strokeWidth={1.8} className="create-dropdown-icon" />
              <span>Postingan</span>
            </button>

            <button
              type="button"
              className="create-dropdown-item"
              onClick={() => handleSelect("report")}
            >
              <Megaphone size={17} strokeWidth={1.8} className="create-dropdown-icon" />
              <span>Lapor</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="create-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="button button--primary compose-nav create-dropdown-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="create-dropdown-label">
          <Plus
            size={24}
            strokeWidth={2}
            className="create-dropdown-plus"
          />
          <span>Buat</span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`create-dropdown-arrow ${isOpen ? "is-open" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="create-dropdown-popover">
          <button
            type="button"
            className="create-dropdown-item"
            onClick={() => handleSelect("post")}
          >
            <PenSquare size={17} strokeWidth={1.8} className="create-dropdown-icon" />
            <span>Postingan</span>
          </button>

          <button
            type="button"
            className="create-dropdown-item"
            onClick={() => handleSelect("report")}
          >
            <Megaphone size={17} strokeWidth={1.8} className="create-dropdown-icon" />
            <span>Lapor</span>
          </button>
        </div>
      )}
    </div>
  );
}
