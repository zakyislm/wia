"use client";
import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { Post } from "@/types/models";
export function PostMenu({ post }: { post: Post }) {
  const { user, updatePost } = useDemo();
  const own = user?.localKey === post.authorKey;
  const menu = useRef<HTMLDetailsElement>(null);
  const [dialog, setDialog] = useState<"report" | "remove" | null>(null);
  const [reason, setReason] = useState("SPAM");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");
  function closeMenu() {
    if (menu.current) menu.current.open = false;
  }
  return (
    <>
      <details className="post-menu" ref={menu}>
        <summary aria-label="Tindakan postingan">
          <MoreHorizontal size={20} />
        </summary>
        <div className="post-menu-options">
          <button
            onClick={() => {
              updatePost(post.localKey, (current) => ({
                ...current,
                saved: !current.saved,
              }));
              setStatus(
                post.saved
                  ? "Postingan dihapus dari simpanan."
                  : "Postingan disimpan di aktivitas pribadi.",
              );
              closeMenu();
            }}
          >
            {post.saved ? "Hapus dari simpanan" : "Simpan postingan"}
          </button>
          {own ? (
            <button
              onClick={() => {
                setDialog("remove");
                closeMenu();
              }}
            >
              Turunkan postingan
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  updatePost(post.localKey, (current) => ({
                    ...current,
                    hidden: true,
                  }));
                  closeMenu();
                }}
              >
                Sembunyikan dari beranda
              </button>
              <button
                onClick={() => {
                  setDialog("report");
                  closeMenu();
                }}
              >
                Laporkan penyalahgunaan
              </button>
            </>
          )}
        </div>
      </details>
      {status && (
        <div role="status" className="feedback-toast">
          {status}
          <Button
            variant="ghost"
            aria-label="Tutup pesan"
            onClick={() => setStatus("")}
          >
            ×
          </Button>
        </div>
      )}
      {dialog && (
        <Dialog
          title={
            dialog === "remove"
              ? "Turunkan postingan?"
              : "Laporkan penyalahgunaan"
          }
          onClose={() => setDialog(null)}
        >
          {dialog === "remove" ? (
            <div className="dialog-body">
              <p>
                Postingan tidak lagi tampil di feed atau Timeline. Tindakan ini
                bukan penyelesaian laporan.
              </p>
              <div className="button-row">
                <Button variant="secondary" onClick={() => setDialog(null)}>
                  Batal
                </Button>
                <Button
                  onClick={() => {
                    updatePost(post.localKey, (current) => ({
                      ...current,
                      isDeleted: true,
                    }));
                    setDialog(null);
                  }}
                >
                  Turunkan postingan
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="dialog-body"
              onSubmit={(e) => {
                e.preventDefault();
                setDialog(null);
                setStatus(
                  "Laporan penyalahgunaan tersimpan sebagai simulasi. Belum dikirim ke pengelola.",
                );
                setDetails("");
              }}
            >
              <label>
                Alasan laporan
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="SPAM">Spam</option>
                  <option value="HOAX">Informasi menyesatkan</option>
                  <option value="HATE_SPEECH">Ujaran kebencian</option>
                  <option value="PORNOGRAPHY">Konten seksual</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </label>
              <label>
                Rincian tambahan
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </label>
              <p className="small muted">
                Form demo ini tidak mengirim data kepada pengelola.
              </p>
              <Button type="submit">Kirim laporan demo</Button>
            </form>
          )}
        </Dialog>
      )}
    </>
  );
}
