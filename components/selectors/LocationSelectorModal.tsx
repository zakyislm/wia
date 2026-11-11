"use client";
import { useState, useMemo, useEffect } from "react";
import { Search, X, History, MapPin, LocateFixed, Check } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { filterLocalLocations } from "@/lib/regions";

const DEFAULT_HISTORY = [
  "Tamansari, Jakarta Barat, DKI Jakarta",
  "Sumur Bandung, Bandung, Jawa Barat",
];

export function LocationSelectorModal({
  isOpen,
  onClose,
  onSelect,
  selectedLocation,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  selectedLocation?: string;
}) {
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<string[]>(DEFAULT_HISTORY);
  const [remoteResults, setRemoteResults] = useState<string[]>([]);
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kavi_location_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistory(parsed.slice(0, 4));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const clean = search.trim();
    if (clean.length < 3) {
      setRemoteResults([]);
      setSearchingRemote(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingRemote(true);
      try {
        const res = await fetch(
          `/api/locations?q=${encodeURIComponent(clean)}`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const json = (await res.json()) as { data?: string[] };
          if (Array.isArray(json.data)) {
            setRemoteResults(json.data);
          }
        }
      } catch {
        // Silent fallback to instant offline list
      } finally {
        if (!controller.signal.aborted) {
          setSearchingRemote(false);
        }
      }
    }, 280);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, isOpen]);

  function pickLocation(loc: string) {
    const clean = loc.trim();
    if (!clean) return;
    const updated = [clean, ...history.filter((h) => h !== clean)].slice(0, 4);
    setHistory(updated);
    try {
      localStorage.setItem("kavi_location_history", JSON.stringify(updated));
    } catch {}
    onSelect(clean);
    onClose();
  }

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) => item.toLowerCase().includes(q));
  }, [history, search]);

  const filteredSuggestions = useMemo(() => {
    const local = filterLocalLocations(search, 12);
    const merged = Array.from(new Set([...local, ...remoteResults]));
    const historySet = new Set(filteredHistory);
    return merged.filter((item) => !historySet.has(item));
  }, [search, remoteResults, filteredHistory]);

  if (!isOpen) return null;

  async function resolveCoords(lat: number, lon: number) {
    try {
      const res = await fetch(
        `/api/locations?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      );
      if (res.ok) {
        const json = (await res.json()) as { data?: string[] };
        if (json.data?.[0]) {
          pickLocation(json.data[0]);
          return;
        }
      }
    } catch {}
    pickLocation("Bandung, Jawa Barat");
  }

  function handleUseCurrentLocation() {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await resolveCoords(pos.coords.latitude, pos.coords.longitude);
          setLocating(false);
        },
        () => {
          setLocating(false);
          pickLocation("Bandung, Jawa Barat");
        },
        { timeout: 3500 },
      );
    } else {
      pickLocation("Bandung, Jawa Barat");
    }
  }

  return (
    <Dialog title="Pilih Lokasi" onClose={onClose} hideHeader className="selector-modal">
      <div className="selector-container">
        <div className="selector-header">
          <div className="selector-search-box">
            <input
              type="text"
              autoFocus
              placeholder="Cari desa, kecamatan, kota, atau tempat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="selector-search-input"
            />
            <Search size={18} className="selector-search-icon" />
          </div>
          <button type="button" className="selector-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="selector-action-row">
          <button
            type="button"
            className="selector-locate-btn"
            disabled={locating}
            onClick={handleUseCurrentLocation}
          >
            <LocateFixed size={16} />
            <span>{locating ? "Mendeteksi lokasi..." : "Pakai lokasimu sekarang"}</span>
          </button>
        </div>

        <div className="selector-list">
          {filteredHistory.map((loc) => {
            const isSelected = selectedLocation === loc;
            return (
              <button
                key={`hist-${loc}`}
                type="button"
                className={`selector-item selector-item-location ${isSelected ? "selected" : ""}`}
                onClick={() => pickLocation(loc)}
              >
                <History size={16} className="selector-item-icon muted" />
                <span className="selector-item-name">{loc}</span>
                {isSelected && <Check size={16} className="selector-check-icon" />}
              </button>
            );
          })}

          {filteredSuggestions.map((loc) => {
            const isSelected = selectedLocation === loc;
            return (
              <button
                key={loc}
                type="button"
                className={`selector-item selector-item-location ${isSelected ? "selected" : ""}`}
                onClick={() => pickLocation(loc)}
              >
                <MapPin size={16} className="selector-item-icon muted" />
                <span className="selector-item-name">{loc}</span>
                {isSelected && <Check size={16} className="selector-check-icon" />}
              </button>
            );
          })}

          {searchingRemote && (
            <p className="small muted selector-searching-note">
              Mencari wilayah Indonesia…
            </p>
          )}

          {search.trim() &&
            !filteredHistory.includes(search.trim()) &&
            !filteredSuggestions.includes(search.trim()) && (
              <button
                type="button"
                className="selector-item selector-item-custom"
                onClick={() => pickLocation(search.trim())}
              >
                <MapPin size={16} className="selector-item-icon muted" />
                <span>Gunakan lokasi &ldquo;{search.trim()}&rdquo;</span>
              </button>
            )}
        </div>
      </div>
    </Dialog>
  );
}
