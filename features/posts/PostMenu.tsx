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
import { getPostPermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectMenu } from "@/components/ui/SelectMenu";
import type { Post } from "@/types/models";

export function PostMenu({ post }: { post: Post }) {
  const { user, updatePost, setPosts, following, setFollowing, showToast } =
    useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const isFollowing = following.includes(post.authorKey);
  const menu = useRef<HTMLDetailsElement>(null);
  const [dialog, setDialog] = useState<"report" | "remove" | null>(null);
  const [reason, setReason] = useState("SPAM");
  const [details, setDetails] = useState("");

  const perms = getPostPermissions(post, user);
  const reportStatus = perms.isReport ? getEffectiveReportStatus(post) : null;
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
          {perms.hasReportSection && (
            <>
              {perms.canTakeGovAction && (
                <button
                  type="button"
                  className="post-menu-item"
                  onClick={() => triggerTakeAction("GOVERNMENT")}
                >
                  <ShieldCheck size={18} strokeWidth={1.8} />
                  <span>Tindak Lanjuti (Aparat)</span>
                </button>
              )}

              {perms.canTakeInternalAction && (
                <button
                  type="button"
                  className="post-menu-item"
                  onClick={() => triggerTakeAction("INTERNAL")}
                >
                  <ShieldAlert size={18} strokeWidth={1.8} />
                  <span>Tindak Lanjuti (Internal)</span>
                </button>
              )}

              {perms.canModerateReport &&
                (!isClosed ? (
                  <button
                    type="button"
                    className="post-menu-item"
                    onClick={() => {
                      const actionReply = [...post.replies]
                        .reverse()
                        .find((r) => r.is_action_taken);
                      const closerRole =
                        actionReply?.actionRole ||
                        (user?.role === "INTERNAL" ? "INTERNAL" : "GOVERNMENT");
                      const closerKey =
                        actionReply?.authorKey ||
                        user?.localKey ||
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
                      showToast(
                        closerRole === "INTERNAL"
                          ? "Laporan ditutup internal."
                          : "Laporan ditandai selesai.",
                        "success",
                      );
                      closeMenu();
                    }}
                  >
                    <CheckCircle2 size={18} strokeWidth={1.8} />
                    <span>Tandai Selesai</span>
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
                      showToast("Laporan dibuka kembali.", "info");
                      closeMenu();
                    }}
                  >
                    <RotateCcw size={18} strokeWidth={1.8} />
                    <span>Buka Lagi Laporan</span>
                  </button>
                ))}

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
                showToast("Link disalin", "success");
              } catch {
                showToast("Tautan tidak dapat disalin.", "error");
              }
              closeMenu();
            }}
          >
            <Link2 size={18} strokeWidth={1.8} />
            <span>Salin Tautan</span>
          </button>

          {perms.canFollow && (
            <button
              type="button"
              className="post-menu-item"
              onClick={() => {
                setFollowing((current) =>
                  current.includes(post.authorKey)
                    ? current.filter((key) => key !== post.authorKey)
                    : [...current, post.authorKey],
                );
                showToast(
                  isFollowing
                    ? "Berhenti mengikuti akun."
                    : "Mulai mengikuti akun.",
                  isFollowing ? "info" : "success",
                );
                closeMenu();
              }}
            >
              {isFollowing ? (
                <UserCheck size={18} strokeWidth={1.8} />
              ) : (
                <UserPlus size={18} strokeWidth={1.8} />
              )}
              <span>{isFollowing ? "Batal Ikuti" : "Ikuti"}</span>
            </button>
          )}

          {perms.canHide && (
            <button
              type="button"
              className="post-menu-item"
              onClick={() => {
                updatePost(post.localKey, (current) => ({
                  ...current,
                  hidden: true,
                }));
                showToast("Postingan disembunyikan dari beranda.", "info");
                closeMenu();
              }}
            >
              <EyeOff size={18} strokeWidth={1.8} />
              <span>Sembunyikan</span>
            </button>
          )}

          <button
            type="button"
            className="post-menu-item"
            onClick={() => {
              const wasSaved = Boolean(post.saved);
              updatePost(post.localKey, (current) => ({
                ...current,
                saved: !current.saved,
              }));
              showToast(
                wasSaved
                  ? "Dihapus dari simpanan."
                  : "Disimpan di tab Tersimpan.",
                wasSaved ? "info" : "success",
              );
              closeMenu();
            }}
          >
            <Bookmark size={18} strokeWidth={1.8} />
            <span>{post.saved ? "Hapus Simpanan" : "Simpan"}</span>
          </button>

          {perms.hasDangerSection && (
            <>
              <div className="post-menu-divider" role="separator" />

              {perms.canMute && (
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
                    showToast("Akun dibisukan dari beranda.", "info");
                    closeMenu();
                  }}
                >
                  <VolumeX size={18} strokeWidth={1.8} />
                  <span>Bisukan Akun</span>
                </button>
              )}

              {perms.canReport && (
                <button
                  type="button"
                  className="post-menu-item post-menu-item--danger"
                  onClick={() => {
                    setDialog("report");
                    closeMenu();
                  }}
                >
                  <AlertCircle size={18} strokeWidth={1.8} />
                  <span>Laporkan</span>
                </button>
              )}

              {perms.canBlock && (
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
                    showToast("Akun telah diblokir.", "info");
                    closeMenu();
                  }}
                >
                  <Ban size={18} strokeWidth={1.8} />
                  <span>Blokir Akun</span>
                </button>
              )}

              {perms.canDelete && (
                <button
                  type="button"
                  className="post-menu-item post-menu-item--danger"
                  onClick={() => {
                    setDialog("remove");
                    closeMenu();
                  }}
                >
                  <Trash2 size={18} strokeWidth={1.8} />
                  <span>Hapus</span>
                </button>
              )}
            </>
          )}
        </div>
      </details>

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
                Postingan tidak lagi tampil di feed atau Laporan. Tindakan ini
                bukan penyelesaian laporan.
              </p>
              <div className="button-row">
                <Button variant="secondary" onClick={() => setDialog(null)}>
                  Batal
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    updatePost(post.localKey, (current) => ({
                      ...current,
                      isDeleted: true,
                    }));
                    setDialog(null);
                    showToast("Postingan berhasil diturunkan.", "success");
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
                showToast(
                  "Laporan penyalahgunaan telah dikirim.",
                  "success",
                );
                setDetails("");
              }}
            >
              <div className="field-block">
                <span className="field-label">Alasan laporan</span>
                <SelectMenu
                  ariaLabel="Alasan laporan"
                  align="left"
                  fullWidth
                  value={reason}
                  onChange={setReason}
                  options={[
                    { value: "SPAM", label: "Spam" },
                    { value: "HOAX", label: "Informasi menyesatkan" },
                    { value: "HATE_SPEECH", label: "Ujaran kebencian" },
                    { value: "PORNOGRAPHY", label: "Konten seksual" },
                    { value: "OTHER", label: "Lainnya" },
                  ]}
                />
              </div>
              <label>
                Rincian tambahan
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </label>
              <Button type="submit">Kirim laporan</Button>
            </form>
          )}
        </Dialog>
      )}
    </>
  );
}
