"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Person } from "@/types/models";
import { emptyFilters, type SearchFilters } from "./filters";

type SelectionKey = "region" | "agency" | "category" | "kind";
interface Props {
  filters: SearchFilters;
  query: string;
  onQueryChange: (query: string) => void;
  onApply: (filters: SearchFilters) => void;
  timeline: boolean;
  accounts: boolean;
  reportOnly: boolean;
  regions: string[];
  categories: string[];
  agencies: Person[];
}

export function SearchControls({
  filters,
  query,
  onQueryChange,
  onApply,
  timeline,
  accounts,
  reportOnly,
  regions,
  categories,
  agencies,
}: Props) {
  const [draft, setDraft] = useState(filters);
  useEffect(() => {
    setDraft(filters);
  }, [filters]);
  const [error, setError] = useState("");
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (
        details.current?.open &&
        !details.current.contains(event.target as Node)
      )
        details.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && details.current?.open) {
        details.current.open = false;
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const groups: {
    key: SelectionKey;
    label: string;
    options: { value: string; label: string }[];
  }[] = [
    {
      key: "region",
      label: "Wilayah",
      options: regions.map((value) => ({ value, label: value })),
    },
    {
      key: "agency",
      label: "Instansi",
      options: agencies.map((person) => ({
        value: person.localKey,
        label: person.name,
      })),
    },
    {
      key: "category",
      label: "Kategori",
      options: categories.map((value) => ({ value, label: value })),
    },
    ...(!timeline && !reportOnly
      ? [
          {
            key: "kind" as const,
            label: "Jenis unggahan",
            options: [
              { value: "general", label: "Umum" },
              { value: "report", label: "Laporan" },
            ],
          },
        ]
      : []),
  ];
  const chips = accounts
    ? []
    : groups.flatMap((group) =>
        filters[group.key].map((value) => ({
          key: group.key,
          value,
          label:
            group.key === "agency"
              ? `@${agencies.find((person) => person.localKey === value)?.username ?? value}`
              : (group.options.find((option) => option.value === value)
                  ?.label ?? value),
        })),
      );
  const dates = accounts
    ? []
    : (["from", "to"] as const)
        .filter((key) => filters[key])
        .map((key) => ({
          key,
          value: filters[key],
          label: `${key === "from" ? "Dari" : "Sampai"} ${filters[key]}`,
        }));
  const count = chips.length + dates.length;
  function toggle(key: SelectionKey, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }
  function close() {
    if (details.current) details.current.open = false;
    trigger.current?.focus();
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) {
      setError("Tanggal awal tidak boleh melewati tanggal akhir.");
      return;
    }
    onApply({ ...draft, query });
    setError("");
    close();
  }
  function reset() {
    setDraft({ ...emptyFilters });
    onApply({ ...emptyFilters, query });
    setError("");
    close();
  }
  return (
    <div className="search-controls">
      <form
        className="search-input-shell"
        role="search"
        onSubmit={(event) => {
          if (details.current?.open) {
            apply(event);
            return;
          }
          event.preventDefault();
          onApply({ ...filters, query });
        }}
      >
        <Button variant="ghost" type="submit" aria-label="Cari">
          <Search />
        </Button>
        <div className="search-tokens">
          {chips.map((chip) => (
            <button
              className="search-token"
              type="button"
              key={`${chip.key}-${chip.value}`}
              aria-label={`Hapus filter ${chip.label}`}
              onClick={() =>
                onApply({
                  ...filters,
                  [chip.key]: filters[chip.key].filter(
                    (value) => value !== chip.value,
                  ),
                })
              }
            >
              {chip.label}
              <X size={14} />
            </button>
          ))}
          {dates.map((chip) => (
            <button
              className="search-token"
              type="button"
              key={chip.key}
              aria-label={`Hapus filter ${chip.label}`}
              onClick={() => onApply({ ...filters, [chip.key]: "" })}
            >
              {chip.label}
              <X size={14} />
            </button>
          ))}
          <label>
            <span className="sr-only">
              {timeline
                ? "Cari laporan atau instansi"
                : "Cari postingan, laporan, atau akun"}
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={
                timeline
                  ? "Cari laporan atau instansi"
                  : "Cari postingan, laporan, atau akun"
              }
            />
          </label>
        </div>
        {!accounts && (
          <details
            className="filter-dropdown"
            ref={details}
            onToggle={(event) => {
              if (event.currentTarget.open) {
                setDraft(filters);
                setError("");
              }
            }}
          >
            <summary
              ref={trigger}
              aria-label="Buka filter"
              title="Filter pencarian"
            >
              <SlidersHorizontal size={20} />
              {!!count && <span className="filter-count">{count}</span>}
            </summary>
            <div
              className="filter-panel"
              role="region"
              aria-label="Filter pencarian"
            >
              <header>
                <div>
                  <h2>Filter pencarian</h2>
                  <p>Pilih satu atau beberapa opsi.</p>
                </div>
                <Button
                  variant="ghost"
                  aria-label="Tutup filter"
                  onClick={close}
                >
                  <X />
                </Button>
              </header>
              <div className="filter-panel-content">
                {groups.map((group) => (
                  <fieldset key={group.key}>
                    <legend>{group.label}</legend>
                    {group.options.map((option) => (
                      <label className="filter-option" key={option.value}>
                        <input
                          type="checkbox"
                          checked={draft[group.key].includes(option.value)}
                          onChange={() => toggle(group.key, option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                    {!group.options.length && (
                      <p className="small muted">Belum ada pilihan.</p>
                    )}
                  </fieldset>
                ))}
                <fieldset>
                  <legend>
                    {timeline ? "Tanggal Closed (WIB)" : "Tanggal unggah (WIB)"}
                  </legend>
                  <div className="filter-dates">
                    <label>
                      Dari tanggal
                      <input
                        type="date"
                        value={draft.from}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            from: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Sampai tanggal
                      <input
                        type="date"
                        value={draft.to}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            to: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </fieldset>
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
              </div>
              <footer>
                <Button variant="ghost" onClick={reset}>
                  Reset filter
                </Button>
                <Button onClick={apply}>Terapkan</Button>
              </footer>
            </div>
          </details>
        )}
      </form>
      {(!!count || !!filters.query) && (
        <button
          type="button"
          className="clear-search"
          onClick={() => {
            onQueryChange("");
            onApply({ ...emptyFilters });
          }}
        >
          Hapus semua
        </button>
      )}
    </div>
  );
}
