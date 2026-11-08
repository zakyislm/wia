"use client";
import { useState, useMemo } from "react";
import { Search, X, History, MapPin, LocateFixed, Check } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";

const historyLocations = [
  "Pelabuhan Tanjung Priok, Jakarta Utara, DKI Jakarta",
  "Tamansari, Jakarta Barat, DKI Jakarta",
];

const suggestedLocations = [
  "Pasar Gembrong, Jatinegara, Jakarta Timur, DKI Jakarta",
  "Cilandak Barat, Cilandak, Jakarta Selatan, DKI Jakarta",
  "Sumur Bandung, Bandung, Jawa Barat",
  "Coblong, Bandung, Jawa Barat",
  "Tarakan Barat, Tarakan, Kalimantan Utara",
  "Tanjung Selor, Bulungan, Kalimantan Utara",
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

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return historyLocations;
    return historyLocations.filter((item) => item.toLowerCase().includes(q));
  }, [search]);

  const filteredSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suggestedLocations;
    return suggestedLocations.filter((item) => item.toLowerCase().includes(q));
  }, [search]);

  if (!isOpen) return null;

  function handleUseCurrentLocation() {
    // Quick auto-locate or browser geolocation
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          onSelect("Bandung, Jawa Barat");
          onClose();
        },
        () => {
          onSelect("Bandung, Jawa Barat");
          onClose();
        },
        { timeout: 3000 }
      );
    } else {
      onSelect("Bandung, Jawa Barat");
      onClose();
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
              placeholder="Type Location..."
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
            onClick={handleUseCurrentLocation}
          >
            <LocateFixed size={16} />
            <span>Use your location</span>
          </button>
        </div>

        <div className="selector-list">
          {filteredHistory.map((loc) => {
            const isSelected = selectedLocation === loc;
            return (
              <button
                key={loc}
                type="button"
                className={`selector-item selector-item-location ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onSelect(loc);
                  onClose();
                }}
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
                onClick={() => {
                  onSelect(loc);
                  onClose();
                }}
              >
                <MapPin size={16} className="selector-item-icon muted" />
                <span className="selector-item-name">{loc}</span>
                {isSelected && <Check size={16} className="selector-check-icon" />}
              </button>
            );
          })}

          {filteredHistory.length === 0 &&
            filteredSuggestions.length === 0 &&
            search.trim() && (
              <button
                type="button"
                className="selector-item selector-item-custom"
                onClick={() => {
                  onSelect(search.trim());
                  onClose();
                }}
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
