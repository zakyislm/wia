/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";

export function isVideoMedia(src: string): boolean {
  return src.endsWith("#video") || /\.(mp4|webm)(\?|$)/i.test(src);
}

export function createMediaPreviewUrl(file: File): string {
  const url = URL.createObjectURL(file);
  const isVid =
    file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name);
  return isVid ? `${url}#video` : url;
}

export function MediaAttachmentPreview({
  media,
  onRemove,
  altPrefix = "Lampiran",
}: {
  media: string[];
  onRemove: (src: string, index: number) => void;
  altPrefix?: string;
}) {
  if (media.length === 0) return null;
  const isMulti = media.length > 1;

  return (
    <div
      className={`media-attachment-list ${isMulti ? "media-gallery--multi media-attachment-list--multi" : "media-attachment-list--single"}`}
    >
      {media.map((src, index) => (
        <figure
          key={src}
          className={`media-attachment-card ${isMulti ? "media-attachment-card--multi" : "media-attachment-card--single"}`}
        >
          {isVideoMedia(src) ? (
            <video src={src} controls muted playsInline />
          ) : (
            <img src={src} alt={`${altPrefix} ${index + 1}`} />
          )}
          <button
            type="button"
            className="media-attachment-remove"
            aria-label={`Hapus media ${index + 1}`}
            onClick={() => onRemove(src, index)}
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </figure>
      ))}
    </div>
  );
}

function triggerAnchorDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadMediaFile(src: string, index: number) {
  const filename = `kavi-gambar-${index + 1}.jpg`;
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    triggerAnchorDownload(src, filename);
    return;
  }
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error("fetch_failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerAnchorDownload(objectUrl, filename);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(src, "_blank", "noopener,noreferrer");
  }
}

export function MediaGallery({
  media,
  altPrefix = "Foto",
  className = "",
}: {
  media: string[];
  altPrefix?: string;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stagePointerDownOnBackdropRef = useRef(false);

  const videos = media.filter((src) => isVideoMedia(src));
  const photos = media.filter((src) => !isVideoMedia(src));
  const isMultiPhotos = photos.length > 1;

  function syncScrollButtons() {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollState({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }

  useEffect(() => {
    if (!isMultiPhotos) return;
    syncScrollButtons();
    window.addEventListener("resize", syncScrollButtons);
    return () => window.removeEventListener("resize", syncScrollButtons);
  }, [isMultiPhotos, photos.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" && photos.length > 1) {
        setZoomed(false);
        setZoomOrigin({ x: 50, y: 50 });
        setActiveIndex((prev) =>
          prev === null ? null : (prev + 1) % photos.length,
        );
      } else if (e.key === "ArrowLeft" && photos.length > 1) {
        setZoomed(false);
        setZoomOrigin({ x: 50, y: 50 });
        setActiveIndex((prev) =>
          prev === null ? null : (prev - 1 + photos.length) % photos.length,
        );
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, photos.length]);

  if (media.length === 0) return null;

  function openLightbox(index: number) {
    setZoomed(false);
    setZoomOrigin({ x: 50, y: 50 });
    setActiveIndex(index);
  }

  function closeLightbox() {
    setZoomed(false);
    setZoomOrigin({ x: 50, y: 50 });
    setActiveIndex(null);
  }

  function scrollCarousel(direction: -1 | 1, e: React.MouseEvent) {
    e.stopPropagation();
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(160, el.clientWidth * 0.68),
      behavior: "smooth",
    });
  }

  const activePhoto =
    activeIndex !== null ? (photos[activeIndex] ?? null) : null;

  return (
    <div
      className={`media-gallery-wrap ${isMultiPhotos ? "media-gallery-wrap--multi" : ""} ${className}`.trim()}
      onClick={(e) => e.stopPropagation()}
    >
      {photos.length > 0 && (
        <div className="media-carousel-shell">
          <div
            ref={scrollerRef}
            className={`media-gallery ${isMultiPhotos ? "media-gallery--multi" : "media-gallery--single"}`}
            onScroll={isMultiPhotos ? syncScrollButtons : undefined}
          >
            {photos.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className={`media-gallery-btn ${isMultiPhotos ? "media-gallery-btn--multi" : "media-gallery-btn--single"}`}
                aria-label={`Lihat penuh ${altPrefix} ${index + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(index);
                }}
              >
                <img src={src} alt={`${altPrefix} ${index + 1}`} />
              </button>
            ))}
          </div>

          {isMultiPhotos && scrollState.left && (
            <button
              type="button"
              className="media-carousel-nav media-carousel-nav--prev"
              aria-label="Foto sebelumnya"
              onClick={(e) => scrollCarousel(-1, e)}
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
          )}
          {isMultiPhotos && scrollState.right && (
            <button
              type="button"
              className="media-carousel-nav media-carousel-nav--next"
              aria-label="Foto berikutnya"
              onClick={(e) => scrollCarousel(1, e)}
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      {videos.map((src, index) => (
        <video
          key={`${src}-vid-${index}`}
          src={src}
          controls
          playsInline
          className="comment-video-media"
          onClick={(e) => e.stopPropagation()}
        />
      ))}

      {activePhoto !== null && activeIndex !== null && (
        <Dialog
          title={`Pratinjau ${altPrefix} ${activeIndex + 1}`}
          onClose={closeLightbox}
          hideHeader
          className="media-lightbox-dialog"
        >
          <div
            className="media-lightbox-stage"
            onPointerDown={(e) => {
              stagePointerDownOnBackdropRef.current =
                e.target === e.currentTarget;
            }}
            onClick={(e) => {
              e.stopPropagation();
              const shouldClose =
                e.target === e.currentTarget &&
                stagePointerDownOnBackdropRef.current;
              stagePointerDownOnBackdropRef.current = false;
              if (shouldClose) {
                closeLightbox();
              }
            }}
          >
            <div
              className="media-lightbox-actions"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="media-lightbox-btn"
                aria-label="Tutup gambar"
                onClick={(e) => {
                  e.stopPropagation();
                  closeLightbox();
                }}
              >
                <X size={20} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="media-lightbox-btn"
                aria-label="Unduh gambar"
                onClick={(e) => {
                  e.stopPropagation();
                  void downloadMediaFile(activePhoto, activeIndex);
                }}
              >
                <Download size={19} strokeWidth={2} />
              </button>
            </div>

            <img
              src={activePhoto}
              alt={`${altPrefix} ${activeIndex + 1}`}
              className={`media-lightbox-img ${zoomed ? "is-zoomed" : ""}`}
              style={
                zoomed
                  ? { transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }
                  : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                if (!zoomed) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.min(
                    100,
                    Math.max(
                      0,
                      ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100,
                    ),
                  );
                  const y = Math.min(
                    100,
                    Math.max(
                      0,
                      ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100,
                    ),
                  );
                  setZoomOrigin({ x, y });
                  setZoomed(true);
                } else {
                  setZoomed(false);
                  setZoomOrigin({ x: 50, y: 50 });
                }
              }}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
