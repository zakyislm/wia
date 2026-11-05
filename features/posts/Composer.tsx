/* eslint-disable @next/next/no-img-element -- Session-only blob URLs cannot use server image optimization. */
"use client";
import { useRef, useState, useEffect } from "react";
import { ImagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useDemo } from "@/features/auth/DemoProvider";
import { photoError } from "@/lib/validation";

export function Composer({ onClose }: { onClose: () => void }) {
  const { people, user, setPosts } = useDemo();
  const router = useRouter();
  const [kind, setKind] = useState<"general" | "report">("general");
  const [content, setContent] = useState("");
  const [province, setProvince] = useState("");
  const [category, setCategory] = useState("");
  const [agencyKeys, setAgencies] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const urls = useRef<string[]>([]);
  const published = useRef(false);
  useEffect(
    () => () => {
      if (!published.current)
        urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  const dirty = !!(
    content ||
    province ||
    category ||
    agencyKeys.length ||
    images.length ||
    anonymous
  );
  function requestClose() {
    if (dirty) setDiscard(true);
    else onClose();
  }
  function publish() {
    if (!user) return;
    if (
      kind === "report" &&
      (!content.trim() || !agencyKeys.length || !province.trim() || !category)
    ) {
      setError(
        "Isi deskripsi, wilayah, kategori dan pilih minimal satu instansi.",
      );
      return;
    }
    if (!content.trim() && !images.length) {
      setError("Tambahkan teks atau foto sebelum menerbitkan.");
      return;
    }
    setPosts((current) => [
      {
        id: "",
        authorId: "",
        topicId: "",
        localKey: crypto.randomUUID(),
        authorKey: user.localKey,
        postedAt: Date.now(),
        kind,
        anonymous: kind === "report" && anonymous,
        content: content.trim(),
        province: kind === "report" ? province : "",
        category: kind === "report" ? category : "",
        agencyKeys: kind === "report" ? agencyKeys : [],
        images,
        upvotesCount: 0,
        vote: null,
        reposted: false,
        replies: [],
        resolutions: [],
      },
      ...current,
    ]);
    published.current = true;
    onClose();
    router.push("/home");
  }
  return (
    <Dialog title="Buat postingan" onClose={requestClose}>
      {discard ? (
        <div className="dialog-body">
          <h3>Buang draf ini?</h3>
          <p>Isi dan lampiran yang belum diterbitkan akan hilang.</p>
          <div className="button-row">
            <Button variant="secondary" onClick={() => setDiscard(false)}>
              Lanjut menulis
            </Button>
            <Button onClick={onClose}>Buang draf</Button>
          </div>
        </div>
      ) : (
        <form
          className="dialog-body"
          onSubmit={(event) => {
            event.preventDefault();
            publish();
          }}
        >
          <div className="tabs" role="group" aria-label="Jenis postingan">
            <Button
              variant={kind === "general" ? "primary" : "ghost"}
              onClick={() => setKind("general")}
            >
              Umum
            </Button>
            <Button
              variant={kind === "report" ? "primary" : "ghost"}
              onClick={() => setKind("report")}
            >
              Laporan
            </Button>
          </div>
          <label>
            {kind === "report" ? "Deskripsi masalah *" : "Ceritamu"}
            <textarea
              autoFocus
              rows={5}
              placeholder="Apa yang ingin kamu bagikan?"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </label>
          {kind === "report" && (
            <>
              <fieldset>
                <legend>Instansi terkait *</legend>
                {people
                  .filter((person) => person.role === "GOVERNMENT")
                  .map((person) => (
                    <label className="check-label" key={person.localKey}>
                      <input
                        type="checkbox"
                        checked={agencyKeys.includes(person.localKey)}
                        onChange={(event) =>
                          setAgencies((current) =>
                            event.target.checked
                              ? [...current, person.localKey]
                              : current.filter(
                                  (key) => key !== person.localKey,
                                ),
                          )
                        }
                      />
                      {person.name} ✓
                    </label>
                  ))}
              </fieldset>
              <label>
                Wilayah *
                <input
                  value={province}
                  placeholder="Provinsi / kota, misalnya Bandung, Jawa Barat"
                  onChange={(event) => setProvince(event.target.value)}
                />
              </label>
              <label>
                Kategori *
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">Pilih kategori</option>
                  {[
                    "Infrastruktur",
                    "Transportasi",
                    "Lingkungan",
                    "Layanan publik",
                    "Lainnya",
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(event) => setAnonymous(event.target.checked)}
                />
                Sembunyikan identitas saya dari publik
              </label>
              <p className="muted small">
                Anonim tidak menjamin identitas tersembunyi dari pengelola. Foto
                dan lokasi dapat mengungkap identitas.
              </p>
            </>
          )}
          <div className="photo-grid">
            {images.map((src, index) => (
              <figure key={src}>
                {/* Local blob previews intentionally use native images. */}
                <img src={src} alt={`Lampiran ${index + 1}`} />
                <button
                  type="button"
                  aria-label={`Hapus foto ${index + 1}`}
                  onClick={() => {
                    URL.revokeObjectURL(src);
                    setImages((current) =>
                      current.filter((image) => image !== src),
                    );
                  }}
                >
                  <X size={16} />
                </button>
              </figure>
            ))}
          </div>
          <label className="upload-label">
            <ImagePlus size={20} />
            Tambah foto
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                const message = photoError(files, images.length);
                if (message) setError(message);
                else {
                  const added = files.map((file) => URL.createObjectURL(file));
                  urls.current.push(...added);
                  setImages((current) => [...current, ...added]);
                  setError("");
                }
                event.target.value = "";
              }}
            />
          </label>
          <small className="muted">
            Maksimal 6 foto · JPG, PNG, WebP · 10 MB/foto
          </small>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <footer className="button-row">
            <Button variant="ghost" onClick={requestClose}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={kind === "general" && !content.trim() && !images.length}
            >
              Publikasikan
            </Button>
          </footer>
        </form>
      )}
    </Dialog>
  );
}
