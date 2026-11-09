"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Link2,
  UserPlus,
  UserCheck,
  EyeOff,
  Bookmark,
  VolumeX,
  AlertCircle,
  Ban,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { getEffectiveReportStatus } from "@/features/discovery/filters";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { Post } from "@/types/models";

export function PostMenu({ post }: { post: Post }) {
  const { updatePost, setPosts, following, setFollowing } = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const isFollowing = following.includes(post.authorKey);
  const menu = useRef<HTMLDetailsElement>(null);
  const [dialog, setDialog] = useState<"report" | "remove" | null>(null);
  const [reason, setReason] = useState("SPAM");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");

  const isReport = post.kind === "report";
  const reportStatus = isReport ? getEffectiveReportStatus(post) : null;
  const isClosed =
    reportStatus === "completed" || reportStatus === "closed_internal";

  function closeMenu() {
    if (menu.current) menu.current.open = false;
  }

  function triggerTakeAction(role: "GOVERNMENT" | "INTERNAL") {
    updatePost(post.localKey, (current) => ({
      ...current,
      reportStatus:
        current.reportStatus === "completed" ||
        current.reportStatus === "closed_internal"
          ? "in_progress"
          : current.reportStatus,
      closedByKey: undefined,
      closedByRole: undefined,
      closedAt: undefined,
      pendingTakeActionRole: role,
    }));
    closeMenu();
    const targetPath = `/posts/${post.localKey}`;
    if (pathname !== targetPath) {
      router.push(targetPath);
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menu.current?.open &&
        !menu.current.contains(event.target as Node)
      ) {
        menu.current.open = false;
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <details className="post-menu" ref={menu}>
        <summary aria-label="Tindakan postingan">
          <MoreHorizontal size={20} />
        </summary>
        <div className="post-menu-options">
          {isReport && (
            <>
              <button
                type="button"
                className="post-menu-item"
                onClick={() => triggerTakeAction("GOVERNMENT")}
              >
                <ShieldCheck size={18} strokeWidth={1.8} />
                <span>Take Action (Aparat)</span>
              </button>

              <button
                type="button"
                className="post-menu-item"
                onClick={() => triggerTakeAction("INTERNAL")}
              >
                <ShieldAlert size={18} strokeWidth={1.8} />
                <span>Take Action (Internal)</span>
              </button>

              {!isClosed ? (
                <button
                  type="button"
                  className="post-menu-item"
                  onClick={() => {
                    const actionReply = [...post.replies]
                      .reverse()
                      .find((r) => r.is_action_taken);
                    const closerRole =
                      actionReply?.actionRole || "GOVERNMENT";
                    const closerKey =
                      actionReply?.authorKey ||
                      (closerRole === "INTERNAL" ? "zaky_internal" : "pupr");
                    updatePost(post.localKey, (current) => ({
                      ...current,
                      reportStatus:
                        closerRole === "INTERNAL"
                          ? "closed_internal"
                          : "completed",
                      closedByKey: closerKey,
                      closedByRole: closerRole,
                      closedAt: Date.now(),
                    }));
                    closeMenu();
                  }}
                >
                  <CheckCircle2 size={18} strokeWidth={1.8} />
                  <span>Mark Closed (Selesai)</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="post-menu-item"
                  onClick={() => {
                    const hasAction = post.replies.some(
                      (r) => r.is_action_taken,
                    );
                    updatePost(post.localKey, (current) => ({
                      ...current,
                      reportStatus: hasAction ? "in_progress" : "waiting",
                      closedByKey: undefined,
                      closedByRole: undefined,
                      closedAt: undefined,
                    }));
                    closeMenu();
                  }}
                >
                  <RotateCcw size={18} strokeWidth={1.8} />
                  <span>Reopen Report</span>
                </button>
              )}

              <div className="post-menu-divider" role="separator" />
            </>
          )}

          <button
            type="button"
            className="post-menu-item"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${location.origin}/posts/${post.localKey}`,
                );
                setStatus("Tautan disalin.");
              } catch {
                setStatus("Tautan tidak dapat disalin.");
              }
              closeMenu();
            }}
          >
            <Link2 size={18} strokeWidth={1.8} />
            <span>Copy Link</span>
          </button>

          <button
            type="button"
            className="post-menu-item"
            onClick={() => {
              setFollowing((current) =>
                current.includes(post.authorKey)
                  ? current.filter((key) => key !== post.authorKey)
                  : [...current, post.authorKey],
              );
              setStatus(
                isFollowing
                  ? "Berhenti mengikuti akun."
                  : "Mulai mengikuti akun.",
              );
              closeMenu();
            }}
          >
            {isFollowing ? (
              <UserCheck size={18} strokeWidth={1.8} />
            ) : (
              <UserPlus size={18} strokeWidth={1.8} />
            )}
            <span>{isFollowing ? "Unfollow" : "Follow"}</span>
          </button>

          <button
            type="button"
            className="post-menu-item"
            onClick={() => {
              updatePost(post.localKey, (current) => ({
                ...current,
                hidden: true,
              }));
              closeMenu();
            }}
          >
            <EyeOff size={18} strokeWidth={1.8} />
            <span>Hide</span>
          </button>

          <button
            type="button"
            className="post-menu-item"
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
            <Bookmark size={18} strokeWidth={1.8} />
            <span>{post.saved ? "Unsave" : "Save"}</span>
          </button>

          <div className="post-menu-divider" role="separator" />

          <button
            type="button"
            className="post-menu-item post-menu-item--danger"
            onClick={() => {
              setPosts((current) =>
                current.map((item) =>
                  item.authorKey === post.authorKey
                    ? { ...item, hidden: true }
                    : item,
                ),
              );
              setStatus("Akun dibisukan dari beranda.");
              closeMenu();
            }}
          >
            <VolumeX size={18} strokeWidth={1.8} />
            <span>Mute</span>
          </button>

          <button
            type="button"
            className="post-menu-item post-menu-item--danger"
            onClick={() => {
              setDialog("report");
              closeMenu();
            }}
          >
            <AlertCircle size={18} strokeWidth={1.8} />
            <span>Report</span>
          </button>

          <button
            type="button"
            className="post-menu-item post-menu-item--danger"
            onClick={() => {
              setPosts((current) =>
                current.map((item) =>
                  item.authorKey === post.authorKey
                    ? { ...item, hidden: true }
                    : item,
                ),
              );
              setStatus("Akun telah diblokir.");
              closeMenu();
            }}
          >
            <Ban size={18} strokeWidth={1.8} />
            <span>Block</span>
          </button>

          <button
            type="button"
            className="post-menu-item post-menu-item--danger"
            onClick={() => {
              setDialog("remove");
              closeMenu();
            }}
          >
            <Trash2 size={18} strokeWidth={1.8} />
            <span>Delete</span>
          </button>
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
