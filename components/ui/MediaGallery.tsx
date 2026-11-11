/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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

export async function uploadMediaFileToR2(
  file: File,
  folder: "pfp" | "posts" | "evidence" = "posts",
  userKey?: string | null,
): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const headers: Record<string, string> = {};
    if (userKey) headers["x-user-id"] = userKey;
    const res = await fetch("/api/upload", {
      method: "POST",
      headers,
      body: fd,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const url = json?.data?.url;
    if (typeof url === "string" && url.length > 0) {
      const isVid =
        file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name);
      return isVid && !url.endsWith("#video") && !/\.(mp4|webm)(\?|$)/i.test(url)
        ? `${url}#video`
        : url;
    }
    return null;
  } catch {
    return null;
  }
}

function LazyGalleryImage({
  src,
  alt,
  buttonClassName,
  ariaLabel,
  onClick,
}: {
  src: string;
  alt: string;
  buttonClassName: string;
  ariaLabel: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(() =>
    src.startsWith("blob:") || src.startsWith("data:") ? src : null,
  );
  const isLoaded = loadedSrc === src;

  return (
    <button
      type="button"
      className={`${buttonClassName} ${isLoaded ? "" : "is-skeleton"}`.trim()}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`media-lazy-img ${isLoaded ? "is-loaded" : ""}`.trim()}
        ref={(el) => {
          if (el && el.complete && el.naturalWidth > 0 && loadedSrc !== src) {
            queueMicrotask(() => setLoadedSrc((prev) => (prev === src ? prev : src)));
          }
        }}
        onLoad={() => setLoadedSrc(src)}
        onError={() => setLoadedSrc(src)}
      />
    </button>
  );
}

/** Shared horizontal carousel state, arrow navigation, and vertical-wheel-to-X scrolling. */
function useHorizontalCarousel(enabled: boolean, itemCount: number) {
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const scrollerRef = useRef<HTMLDivElement>(null);

  const syncScrollButtons = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollState({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    syncScrollButtons();
    window.addEventListener("resize", syncScrollButtons);
    return () => window.removeEventListener("resize", syncScrollButtons);
  }, [enabled, itemCount, syncScrollButtons]);

  useEffect(() => {
    if (!enabled) return;
    const el = scrollerRef.current;
    if (!el) return;

    function handleWheel(event: WheelEvent) {
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX) || event.deltaY === 0) {
        return;
      }
      const maxScroll = el!.scrollWidth - el!.clientWidth;
      if (maxScroll <= 1) return;
      const atStart = el!.scrollLeft <= 0 && event.deltaY < 0;
      const atEnd = el!.scrollLeft >= maxScroll - 1 && event.deltaY > 0;
      if (atStart || atEnd) return;
      event.preventDefault();
      el!.scrollLeft = Math.min(
        maxScroll,
        Math.max(0, el!.scrollLeft + event.deltaY),
      );
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [enabled, itemCount]);

  function scrollCarousel(direction: -1 | 1, event: React.MouseEvent) {
    event.stopPropagation();
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(160, el.clientWidth * 0.68),
      behavior: "smooth",
    });
  }

  return { scrollerRef, scrollState, syncScrollButtons, scrollCarousel };
}

function CarouselNavButtons({
  canPrev,
  canNext,
  onScroll,
}: {
  canPrev: boolean;
  canNext: boolean;
  onScroll: (direction: -1 | 1, event: React.MouseEvent) => void;
}) {
  return (
    <>
      {canPrev && (
        <button
          type="button"
          className="media-carousel-nav media-carousel-nav--prev"
          aria-label="Foto sebelumnya"
          onClick={(e) => onScroll(-1, e)}
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          className="media-carousel-nav media-carousel-nav--next"
          aria-label="Foto berikutnya"
          onClick={(e) => onScroll(1, e)}
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      )}
    </>
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

/** Shared fullscreen lightbox with pointer-origin zoom in/out and arrow navigation. */
function MediaLightbox({
  photos,
  activeIndex,
  altPrefix,
  onClose,
  onChangeIndex,
}: {
  photos: string[];
  activeIndex: number | null;
  altPrefix: string;
  onClose: () => void;
  onChangeIndex: React.Dispatch<React.SetStateAction<number | null>>;
}) {
  const [zoomState, setZoomState] = useState<{
    index: number;
    origin: { x: number; y: number };
  } | null>(null);
  const stagePointerDownOnBackdropRef = useRef(false);

  const zoomed = activeIndex !== null && zoomState?.index === activeIndex;
  const zoomOrigin = zoomState?.origin ?? { x: 50, y: 50 };

  const handleClose = useCallback(() => {
    setZoomState(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (activeIndex === null) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" && photos.length > 1) {
        onChangeIndex((prev) =>
          prev === null ? null : (prev + 1) % photos.length,
        );
      } else if (e.key === "ArrowLeft" && photos.length > 1) {
        onChangeIndex((prev) =>
          prev === null ? null : (prev - 1 + photos.length) % photos.length,
        );
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, photos.length, onChangeIndex]);

  const activePhoto =
    activeIndex !== null ? (photos[activeIndex] ?? null) : null;
  if (activePhoto === null || activeIndex === null) return null;

  return (
    <Dialog
      title={`Pratinjau ${altPrefix} ${activeIndex + 1}`}
      onClose={handleClose}
      hideHeader
      className="media-lightbox-dialog"
    >
      <div
        className="media-lightbox-stage"
        onPointerDown={(e) => {
          e.stopPropagation();
          stagePointerDownOnBackdropRef.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          e.stopPropagation();
          const shouldClose =
            e.target === e.currentTarget &&
            stagePointerDownOnBackdropRef.current;
          stagePointerDownOnBackdropRef.current = false;
          if (shouldClose) {
            handleClose();
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
              handleClose();
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
              setZoomState({ index: activeIndex, origin: { x, y } });
            } else {
              setZoomState(null);
            }
          }}
        />
      </div>
    </Dialog>
  );
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isMulti = media.length > 1;
  const photos = media.filter((src) => !isVideoMedia(src));
  const { scrollerRef, scrollState, syncScrollButtons, scrollCarousel } =
    useHorizontalCarousel(isMulti, media.length);

  if (media.length === 0) return null;

  let photoCursor = 0;
  const listNode = (
    <div
      ref={isMulti ? scrollerRef : undefined}
      className={`media-attachment-list ${isMulti ? "media-gallery--multi media-attachment-list--multi" : "media-attachment-list--single"}`}
      onScroll={isMulti ? syncScrollButtons : undefined}
    >
      {media.map((src, index) => {
        const isVideo = isVideoMedia(src);
        const photoIndex = isVideo ? -1 : photoCursor++;
        return (
          <figure
            key={`${src}-${index}`}
            className={`media-attachment-card ${isMulti ? "media-attachment-card--multi" : "media-attachment-card--single"}`}
          >
            {isVideo ? (
              <video src={src} controls muted playsInline preload="metadata" />
            ) : (
              <LazyGalleryImage
                src={src}
                alt={`${altPrefix} ${index + 1}`}
                buttonClassName="media-attachment-trigger"
                ariaLabel={`Lihat penuh ${altPrefix} ${index + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(photoIndex);
                }}
              />
            )}
            <button
              type="button"
              className="media-attachment-remove"
              aria-label={`Hapus media ${index + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(src, index);
              }}
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </figure>
        );
      })}
    </div>
  );

  return (
    <>
      {isMulti ? (
        <div
          className="media-carousel-shell media-attachment-shell"
          onClick={(e) => e.stopPropagation()}
        >
          {listNode}
          <CarouselNavButtons
            canPrev={scrollState.left}
            canNext={scrollState.right}
            onScroll={scrollCarousel}
          />
        </div>
      ) : (
        listNode
      )}

      <MediaLightbox
        photos={photos}
        activeIndex={activeIndex}
        altPrefix={altPrefix}
        onClose={() => setActiveIndex(null)}
        onChangeIndex={setActiveIndex}
      />
    </>
  );
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
  const videos = media.filter((src) => isVideoMedia(src));
  const photos = media.filter((src) => !isVideoMedia(src));
  const isMultiPhotos = photos.length > 1;
  const { scrollerRef, scrollState, syncScrollButtons, scrollCarousel } =
    useHorizontalCarousel(isMultiPhotos, photos.length);

  if (media.length === 0) return null;

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
              <LazyGalleryImage
                key={`${src}-${index}`}
                src={src}
                alt={`${altPrefix} ${index + 1}`}
                buttonClassName={`media-gallery-btn ${isMultiPhotos ? "media-gallery-btn--multi" : "media-gallery-btn--single"}`}
                ariaLabel={`Lihat penuh ${altPrefix} ${index + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(index);
                }}
              />
            ))}
          </div>

          {isMultiPhotos && (
            <CarouselNavButtons
              canPrev={scrollState.left}
              canNext={scrollState.right}
              onScroll={scrollCarousel}
            />
          )}
        </div>
      )}

      {videos.map((src, index) => (
        <video
          key={`${src}-vid-${index}`}
          src={src}
          controls
          playsInline
          preload="metadata"
          className="comment-video-media"
          onClick={(e) => e.stopPropagation()}
        />
      ))}

      <MediaLightbox
        photos={photos}
        activeIndex={activeIndex}
        altPrefix={altPrefix}
        onClose={() => setActiveIndex(null)}
        onChangeIndex={setActiveIndex}
      />
    </div>
  );
}
