"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  Megaphone,
  MessageSquare,
  Plus,
  X,
} from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog } from "@/components/ui/Dialog";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { LocationSelectorModal } from "@/components/selectors/LocationSelectorModal";
import { defaultTopics } from "@/components/selectors/TopicSelectorModal";
import { EditProfile } from "@/features/profile/Profile";
import type { MessageRequestPolicy } from "@/features/workspace/state";
import type { Person } from "@/types/models";

type NotificationGroupKey = "reports" | "social" | "messages" | "topics";

function SettingsSwitch({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`composer-anon-switch ${checked ? "is-on" : ""}`}
      onClick={() => onToggle(!checked)}
    >
      <span className="composer-anon-switch-thumb" />
    </button>
  );
}

function SettingsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="settings-group" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="settings-group-title">
        {title}
      </h2>
      <div className="settings-card">{children}</div>
    </section>
  );
}

function UsernameModal({
  currentUsername,
  people,
  userKey,
  onSave,
  onClose,
}: {
  currentUsername: string;
  people: Person[];
  userKey: string;
  onSave: (nextUsername: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentUsername);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleaned = value.trim().replace(/^@+/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(cleaned)) {
      setError(
        "Nama pengguna harus 3 sampai 24 karakter huruf kecil, angka, atau garis bawah.",
      );
      return;
    }
    const taken = people.some(
      (person) =>
        person.localKey !== userKey &&
        person.username.toLowerCase() === cleaned,
    );
    if (taken) {
      setError("Nama pengguna itu sudah dipakai.");
      return;
    }
    onSave(cleaned);
    onClose();
  }

  return (
    <Dialog
      title="Ubah Nama Pengguna"
      onClose={onClose}
      className="settings-modal-dialog"
    >
      <form className="settings-modal-body" onSubmit={handleSubmit}>
        <label className="settings-modal-field">
          <span>Nama pengguna (@)</span>
          <div className="settings-handle-input-wrap">
            <span className="muted">@</span>
            <input
              type="text"
              autoFocus
              maxLength={24}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              placeholder="nama_pengguna"
            />
          </div>
        </label>
        {error && (
          <p className="composer-error" role="alert">
            {error}
          </p>
        )}
        <div className="settings-modal-footer">
          <button
            type="button"
            className="composer-cancel-btn"
            onClick={onClose}
          >
            Batal
          </button>
          <button type="submit" className="composer-post-btn">
            Simpan
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function MutedWordsModal({
  words,
  onAdd,
  onRemove,
  onClose,
}: {
  words: string[];
  onAdd: (word: string) => void;
  onRemove: (word: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const cleaned = draft.trim();
    if (!cleaned) return;
    onAdd(cleaned);
    setDraft("");
  }

  return (
    <Dialog
      title="Kata & frasa yang dibisukan"
      onClose={onClose}
      className="settings-modal-dialog"
    >
      <div className="settings-modal-body">
        <p className="small muted">
          Postingan di beranda yang memuat kata atau frasa ini akan disembunyikan.
        </p>
        <form className="settings-word-form" onSubmit={handleAdd}>
          <input
            type="text"
            autoFocus
            value={draft}
            maxLength={40}
            placeholder="Tambah kata atau #tag..."
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="composer-post-btn">
            Tambah
          </button>
        </form>
        {words.length > 0 ? (
          <div className="settings-chip-list">
            {words.map((word) => (
              <span key={word} className="settings-word-chip">
                <span>{word}</span>
                <button
                  type="button"
                  aria-label={`Hapus ${word}`}
                  onClick={() => onRemove(word)}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="small muted">Belum ada kata atau frasa yang dibisukan.</p>
        )}
      </div>
    </Dialog>
  );
}

function AccountListModal({
  title,
  description,
  emptyText,
  activeLabel,
  inactiveLabel,
  people,
  selfKey,
  selectedKeys,
  onToggle,
  onClose,
}: {
  title: string;
  description: string;
  emptyText: string;
  activeLabel: string;
  inactiveLabel: string;
  people: Person[];
  selfKey?: string;
  selectedKeys: string[];
  onToggle: (personKey: string, nextActive: boolean) => void;
  onClose: () => void;
}) {
  const candidates = people.filter((person) => person.localKey !== selfKey);
  const activePeople = candidates.filter((person) =>
    selectedKeys.includes(person.localKey),
  );
  const availablePeople = candidates.filter(
    (person) => !selectedKeys.includes(person.localKey),
  );

  return (
    <Dialog title={title} onClose={onClose} className="settings-modal-dialog">
      <div className="settings-modal-body">
        <p className="small muted">{description}</p>
        {activePeople.length > 0 ? (
          <div className="settings-modal-list">
            {activePeople.map((person) => (
              <div key={person.localKey} className="settings-modal-person-row">
                <div className="settings-modal-person-info">
                  <Avatar name={person.name} src={person.image} />
                  <div>
                    <strong className="settings-modal-person-name">
                      {person.name}
                    </strong>
                    <span className="small muted">@{person.username}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="settings-action-btn"
                  onClick={() => onToggle(person.localKey, false)}
                >
                  {activeLabel}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="small muted">{emptyText}</p>
        )}

        {availablePeople.length > 0 && (
          <>
            <p className="settings-modal-subhead">Tambah dari daftar akun</p>
            <div className="settings-modal-list">
              {availablePeople.slice(0, 5).map((person) => (
                <div
                  key={person.localKey}
                  className="settings-modal-person-row"
                >
                  <div className="settings-modal-person-info">
                    <Avatar name={person.name} src={person.image} />
                    <div>
                      <strong className="settings-modal-person-name">
                        {person.name}
                      </strong>
                      <span className="small muted">@{person.username}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="settings-action-btn"
                    onClick={() => onToggle(person.localKey, true)}
                  >
                    {inactiveLabel}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

function PreferredTopicsModal({
  selectedTopics,
  onToggleTopic,
  onClose,
}: {
  selectedTopics: string[];
  onToggleTopic: (topicName: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      title="Minat topik"
      onClose={onClose}
      className="settings-modal-dialog"
    >
      <div className="settings-modal-body">
        <p className="small muted">
          Pilih topik yang ingin kamu utamakan di linimasa Untuk Kamu.
        </p>
        <div className="settings-topic-grid">
          {defaultTopics.map((topic) => {
            const active = selectedTopics.includes(topic.name);
            return (
              <button
                key={topic.id}
                type="button"
                className={`settings-topic-pill ${active ? "is-active" : ""}`}
                onClick={() => onToggleTopic(topic.name)}
              >
                {topic.name}
              </button>
            );
          })}
        </div>
        <div className="settings-modal-footer">
          <button
            type="button"
            className="composer-post-btn"
            onClick={onClose}
          >
            Selesai
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function ConfirmDangerModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog title={title} onClose={onClose} className="settings-modal-dialog">
      <div className="settings-modal-body">
        <p className="muted">{message}</p>
        <div className="settings-modal-footer">
          <button
            type="button"
            className="composer-cancel-btn"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="button"
            className="settings-danger-btn"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function Settings() {
  const {
    user,
    people,
    setPeople,
    setPosts,
    workspace,
    setWorkspace,
    logout,
    showToast,
  } = useDemo();
  const router = useRouter();

  const [openNotifGroup, setOpenNotifGroup] =
    useState<NotificationGroupKey | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editUsernameOpen, setEditUsernameOpen] = useState(false);
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [mutedWordsOpen, setMutedWordsOpen] = useState(false);
  const [mutedUsersOpen, setMutedUsersOpen] = useState(false);
  const [blockedUsersOpen, setBlockedUsersOpen] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [dangerConfirm, setDangerConfirm] = useState<
    "delete_posts" | "delete_account" | null
  >(null);

  const isOfficial =
    user?.role === "GOVERNMENT" || user?.role === "INTERNAL";

  function updatePreference<K extends keyof typeof workspace>(
    key: K,
    value: (typeof workspace)[K],
    notice: string,
  ) {
    setWorkspace((current) => ({ ...current, [key]: value }));
    showToast(notice, "success");
  }

  function toggleNotificationGroup(group: NotificationGroupKey) {
    setOpenNotifGroup((current) => (current === group ? null : group));
  }

  return (
    <ProductShell title="Pengaturan" active="settings">
      <section className="settings-page">

        {/* 1. Akun */}
        <SettingsSection id="akun" title="Akun">
          <div className="settings-row">
            <div className="settings-row-leading">
              <Avatar
                name={user?.name ?? "Pengguna"}
                src={user?.image}
              />
              <div className="settings-row-copy">
                <strong className="settings-row-title">Profil</strong>
                <span className="settings-row-subtitle">
                  {user?.name ?? "Pengguna"}
                  {user?.bio ? ` · ${user.bio}` : ""}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="settings-action-btn"
              onClick={() => user && setEditProfileOpen(true)}
            >
              Ubah
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">Nama pengguna</strong>
              <span className="settings-row-subtitle">
                @{user?.username ?? "-"}
              </span>
            </div>
            <button
              type="button"
              className="settings-action-btn"
              onClick={() => user && setEditUsernameOpen(true)}
            >
              Ubah
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">Wilayah</strong>
              <span className="settings-row-subtitle">
                {user?.region || "Belum diatur"}
              </span>
            </div>
            <button
              type="button"
              className="settings-action-btn"
              onClick={() => user && setRegionModalOpen(true)}
            >
              Ubah
            </button>
          </div>

          <Link href="/activity" className="settings-row settings-row--link">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Riwayat aktivitas pribadi
              </strong>
              <span className="settings-row-subtitle">
                Lihat dukungan, komentar, bagikan ulang, tersimpan, dan validasi
                sesi ini
              </span>
            </div>
            <ChevronRight size={18} className="settings-chevron" />
          </Link>

          <Link href="/recovery" className="settings-row settings-row--link">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Pemulihan kata sandi
              </strong>
              <span className="settings-row-subtitle">
                Tinjau alur pemulihan akun (sesi demo lokal)
              </span>
            </div>
            <ChevronRight size={18} className="settings-chevron" />
          </Link>
        </SettingsSection>

        {/* 2. Instansi */}
        <SettingsSection id="instansi" title="Instansi">
          <Link
            href={isOfficial ? "/tugas" : "/verification"}
            className="settings-row settings-row--link"
          >
            <div className="settings-row-leading">
              {isOfficial && user ? (
                <Avatar name={user.name} src={user.image} />
              ) : (
                <span className="settings-icon-badge" aria-hidden="true">
                  <Building2 size={18} strokeWidth={1.8} />
                </span>
              )}
              <div className="settings-row-copy">
                <strong className="settings-row-title">
                  {isOfficial ? (
                    <span className="settings-inline-badge">
                      {user?.name}
                      <VerifiedBadge role={user!.role} size={15} />
                    </span>
                  ) : workspace.verification.status === "submitted" ? (
                    workspace.verification.name
                  ) : (
                    "Identitas Instansi Resmi"
                  )}
                </strong>
                <span className="settings-row-subtitle">
                  {isOfficial
                    ? user?.role === "GOVERNMENT"
                      ? "Akun Instansi Pemerintah Terverifikasi"
                      : "Akun Tim Internal & Moderasi Terverifikasi"
                    : workspace.verification.status === "submitted"
                      ? `Menunggu pemeriksaan · ${workspace.verification.region}`
                      : "Ajukan verifikasi untuk mewakili instansi atau dinas"}
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="settings-chevron" />
          </Link>

          <div className="settings-band-row">
            <Link
              href={isOfficial ? "/tugas" : "/verification"}
              className="settings-band-btn"
            >
              {!isOfficial && workspace.verification.status === "none" && (
                <Plus size={16} strokeWidth={2} />
              )}
              <span>
                {isOfficial
                  ? "Buka daftar tugas penanganan"
                  : workspace.verification.status === "submitted"
                    ? "Lihat detail pengajuan verifikasi"
                    : "Ajukan verifikasi instansi"}
              </span>
            </Link>
          </div>

          <Link href="/laporan" className="settings-row settings-row--link">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Direktori Laporan & Instansi
              </strong>
              <span className="settings-row-subtitle">
                Pantau seluruh laporan warga dan progres tindak lanjut dinas
              </span>
            </div>
            <ChevronRight size={18} className="settings-chevron" />
          </Link>
        </SettingsSection>

        {/* 3. Notifikasi */}
        <SettingsSection id="notifikasi" title="Notifikasi">
          <div className="settings-accordion-group">
            <button
              type="button"
              className="settings-row settings-row--accordion"
              aria-expanded={openNotifGroup === "reports"}
              onClick={() => toggleNotificationGroup("reports")}
            >
              <div className="settings-row-leading">
                <Megaphone
                  size={18}
                  strokeWidth={1.8}
                  className="settings-leading-icon"
                />
                <strong className="settings-row-title">
                  Laporan & Validasi
                </strong>
              </div>
              <ChevronDown
                size={18}
                className={`settings-chevron ${openNotifGroup === "reports" ? "is-open" : ""}`}
              />
            </button>
            {openNotifGroup === "reports" && (
              <div className="settings-sublist">
                <div className="settings-subrow">
                  <div className="settings-row-copy">
                    <span className="settings-subrow-title">
                      Pembaruan status laporan & bukti penyelesaian
                    </span>
                  </div>
                  <SettingsSwitch
                    checked={workspace.notificationReports}
                    label="Pembaruan status laporan"
                    onToggle={(next) =>
                      updatePreference(
                        "notificationReports",
                        next,
                        "Preferensi notifikasi laporan diperbarui.",
                      )
                    }
                  />
                </div>
                <div className="settings-subrow">
                  <div className="settings-row-copy">
                    <span className="settings-subrow-title">
                      Pengingat validasi warga 72 jam
                    </span>
                  </div>
                  <SettingsSwitch
                    checked={workspace.notificationValidation}
                    label="Pengingat validasi 72 jam"
                    onToggle={(next) =>
                      updatePreference(
                        "notificationValidation",
                        next,
                        "Preferensi pengingat validasi diperbarui.",
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="settings-accordion-group">
            <button
              type="button"
              className="settings-row settings-row--accordion"
              aria-expanded={openNotifGroup === "social"}
              onClick={() => toggleNotificationGroup("social")}
            >
              <div className="settings-row-leading">
                <Heart
                  size={18}
                  strokeWidth={1.8}
                  className="settings-leading-icon"
                />
                <strong className="settings-row-title">Interaksi Sosial</strong>
              </div>
              <ChevronDown
                size={18}
                className={`settings-chevron ${openNotifGroup === "social" ? "is-open" : ""}`}
              />
            </button>
            {openNotifGroup === "social" && (
              <div className="settings-sublist">
                <div className="settings-subrow">
                  <div className="settings-row-copy">
                    <span className="settings-subrow-title">
                      Komentar, balasan, dan sebutan (@)
                    </span>
                  </div>
                  <SettingsSwitch
                    checked={workspace.notificationSocial}
                    label="Komentar, balasan, dan sebutan"
                    onToggle={(next) =>
                      updatePreference(
                        "notificationSocial",
                        next,
                        "Preferensi notifikasi sosial diperbarui.",
                      )
                    }
                  />
                </div>
                <div className="settings-subrow">
                  <div className="settings-row-copy">
                    <span className="settings-subrow-title">
                      Dukungan dan bagikan ulang pada postinganmu
                    </span>
                  </div>
                  <SettingsSwitch
                    checked={workspace.notificationEngagement}
                    label="Dukungan dan bagikan ulang"
                    onToggle={(next) =>
                      updatePreference(
                        "notificationEngagement",
                        next,
                        "Preferensi notifikasi interaksi diperbarui.",
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="settings-accordion-group">
            <button
              type="button"
              className="settings-row settings-row--accordion"
              aria-expanded={openNotifGroup === "messages"}
              onClick={() => toggleNotificationGroup("messages")}
            >
              <div className="settings-row-leading">
                <MessageSquare
                  size={18}
                  strokeWidth={1.8}
                  className="settings-leading-icon"
                />
                <strong className="settings-row-title">Obrolan & Pesan</strong>
              </div>
              <ChevronDown
                size={18}
                className={`settings-chevron ${openNotifGroup === "messages" ? "is-open" : ""}`}
              />
            </button>
            {openNotifGroup === "messages" && (
              <div className="settings-sublist">
                <div className="settings-subrow">
                  <div className="settings-row-copy">
                    <span className="settings-subrow-title">
                      Pesan langsung & tanggapan instansi
                    </span>
                  </div>
                  <SettingsSwitch
                    checked={workspace.notificationMessages}
                    label="Notifikasi obrolan"
                    onToggle={(next) =>
                      updatePreference(
                        "notificationMessages",
                        next,
                        "Preferensi notifikasi obrolan diperbarui.",
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="settings-accordion-group">
            <button
              type="button"
              className="settings-row settings-row--accordion"
              aria-expanded={openNotifGroup === "topics"}
              onClick={() => toggleNotificationGroup("topics")}
            >
              <div className="settings-row-leading">
                <MapPin
                  size={18}
                  strokeWidth={1.8}
                  className="settings-leading-icon"
                />
                <strong className="settings-row-title">Topik & Wilayah</strong>
              </div>
              <ChevronDown
                size={18}
                className={`settings-chevron ${openNotifGroup === "topics" ? "is-open" : ""}`}
              />
            </button>
            {openNotifGroup === "topics" && (
              <div className="settings-sublist">
                <div className="settings-subrow">
                  <div className="settings-row-copy">
                    <span className="settings-subrow-title">
                      Ringkasan mingguan topik & wilayah pilihan
                    </span>
                  </div>
                  <SettingsSwitch
                    checked={workspace.notificationDigest}
                    label="Ringkasan topik dan wilayah"
                    onToggle={(next) =>
                      updatePreference(
                        "notificationDigest",
                        next,
                        "Preferensi ringkasan wilayah diperbarui.",
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* 4. Preferensi Konten */}
        <SettingsSection id="preferensi-konten" title="Preferensi Konten">
          <button
            type="button"
            className="settings-row settings-row--link"
            onClick={() => setMutedWordsOpen(true)}
          >
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Kata & frasa yang dibisukan
              </strong>
              <span className="settings-row-subtitle">
                Sembunyikan postingan yang memuat kata tertentu ·{" "}
                {workspace.mutedWords.length} kata
              </span>
            </div>
            <ChevronRight size={18} className="settings-chevron" />
          </button>

          <button
            type="button"
            className="settings-row settings-row--link"
            onClick={() => setMutedUsersOpen(true)}
          >
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Akun yang dibisukan
              </strong>
              <span className="settings-row-subtitle">
                Akun dibisukan disembunyikan dari beranda ·{" "}
                {workspace.mutedUsers.length} akun
              </span>
            </div>
            <ChevronRight size={18} className="settings-chevron" />
          </button>

          <button
            type="button"
            className="settings-row settings-row--link"
            onClick={() => setBlockedUsersOpen(true)}
          >
            <div className="settings-row-copy">
              <strong className="settings-row-title">Akun yang diblokir</strong>
              <span className="settings-row-subtitle">
                Akun diblokir tidak dapat berinteraksi denganmu ·{" "}
                {workspace.blockedUsers.length} akun
              </span>
            </div>
            <ChevronRight size={18} className="settings-chevron" />
          </button>

          <button
            type="button"
            className="settings-row settings-row--link"
            onClick={() => setTopicsOpen(true)}
          >
            <div className="settings-row-copy">
              <strong className="settings-row-title">Minat topik</strong>
              <span className="settings-row-subtitle">
                Atur topik utama yang tampil di beranda ·{" "}
                {workspace.preferredTopics.length} dipilih
              </span>
            </div>
            <ChevronRight size={18} className="settings-chevron" />
          </button>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Tampilkan laporan sensitif secara otomatis
              </strong>
              <span className="settings-row-subtitle">
                Jika nonaktif, foto kondisi lapangan yang sensitif perlu diklik
                untuk dibuka
              </span>
            </div>
            <SettingsSwitch
              checked={workspace.showSensitiveReports}
              label="Tampilkan laporan sensitif"
              onToggle={(next) =>
                updatePreference(
                  "showSensitiveReports",
                  next,
                  "Preferensi konten sensitif diperbarui.",
                )
              }
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Putar video otomatis
              </strong>
              <span className="settings-row-subtitle">
                Berlaku untuk lampiran video di postingan, laporan, dan komentar
              </span>
            </div>
            <SettingsSwitch
              checked={workspace.autoplayVideos}
              label="Putar video otomatis"
              onToggle={(next) =>
                updatePreference(
                  "autoplayVideos",
                  next,
                  "Preferensi pemutaran video diperbarui.",
                )
              }
            />
          </div>
        </SettingsSection>

        {/* 5. Privasi */}
        <SettingsSection id="privasi" title="Privasi">
          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Izinkan permintaan pesan dari
              </strong>
              <span className="settings-row-subtitle">
                Akun yang kamu ikuti selalu dapat mengirim pesan langsung
              </span>
            </div>
            <SelectMenu
              ariaLabel="Izinkan permintaan pesan dari"
              value={workspace.privacyMessageRequests}
              options={[
                { value: "everyone", label: "Semua orang" },
                { value: "following", label: "Yang diikuti" },
                { value: "agencies", label: "Hanya instansi" },
              ]}
              onChange={(nextValue) =>
                updatePreference(
                  "privacyMessageRequests",
                  nextValue as MessageRequestPolicy,
                  "Kebijakan permintaan pesan diperbarui.",
                )
              }
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Tampilkan postingan disukai di profil
              </strong>
              <span className="settings-row-subtitle">
                Tampilkan postingan dan laporan yang kamu dukung di profil
              </span>
            </div>
            <SettingsSwitch
              checked={workspace.privacyShowLikes}
              label="Tampilkan postingan disukai di profil"
              onToggle={(next) =>
                updatePreference(
                  "privacyShowLikes",
                  next,
                  "Visibilitas postingan disukai diperbarui.",
                )
              }
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Izinkan orang lain menyebut akunmu
              </strong>
              <span className="settings-row-subtitle">
                Warga lain bisa menandai @{user?.username ?? "akun"} di komentar
                dan laporan publik
              </span>
            </div>
            <SettingsSwitch
              checked={workspace.privacyAllowMentions}
              label="Izinkan penyebutan akun"
              onToggle={(next) =>
                updatePreference(
                  "privacyAllowMentions",
                  next,
                  "Pengaturan penyebutan akun diperbarui.",
                )
              }
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Bawaan laporan baru sebagai Anonim
              </strong>
              <span className="settings-row-subtitle">
                Aktifkan mode anonim otomatis tiap kali membuka formulir Lapor
              </span>
            </div>
            <SettingsSwitch
              checked={workspace.privacyDefaultAnonymous}
              label="Bawaan laporan anonim"
              onToggle={(next) =>
                updatePreference(
                  "privacyDefaultAnonymous",
                  next,
                  "Pengaturan bawaan laporan anonim diperbarui.",
                )
              }
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Pedoman privasi & anonimitas
              </strong>
              <span className="settings-row-subtitle">
                Pelajari cara identitas anonim, lokasi, dan sesi demo dikelola
              </span>
            </div>
            <Link href="/help#anonymity" className="settings-action-btn">
              Kelola
            </Link>
          </div>
        </SettingsSection>

        {/* 6. Zona Merah */}
        <SettingsSection id="zona-merah" title="Zona Merah">
          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Matikan semua notifikasi
              </strong>
              <span className="settings-row-subtitle">
                Hentikan seluruh pemberitahuan laporan, sosial, dan obrolan
              </span>
            </div>
            <button
              type="button"
              className="settings-danger-btn"
              onClick={() => {
                setWorkspace((current) => ({
                  ...current,
                  notificationSocial: false,
                  notificationReports: false,
                  notificationValidation: false,
                  notificationEngagement: false,
                  notificationMessages: false,
                  notificationDigest: false,
                }));
                showToast("Semua notifikasi dimatikan.", "info");
              }}
            >
              Matikan notifikasi
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">
                Hapus semua postingan
              </strong>
              <span className="settings-row-subtitle">
                Hapus permanen seluruh postingan dan balasan akun ini di sesi
                demo
              </span>
            </div>
            <button
              type="button"
              className="settings-danger-btn"
              onClick={() => setDangerConfirm("delete_posts")}
            >
              Hapus postingan
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong className="settings-row-title">Hapus akun</strong>
              <span className="settings-row-subtitle">
                Hapus akses sesi demo dan keluar kembali ke halaman masuk
              </span>
            </div>
            <button
              type="button"
              className="settings-danger-btn"
              onClick={() => setDangerConfirm("delete_account")}
            >
              Hapus akun
            </button>
          </div>
        </SettingsSection>

        <div className="settings-logout-wrap">
          <button
            type="button"
            className="settings-logout-btn"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut size={16} strokeWidth={1.8} />
            <span>Keluar dari sesi demo</span>
          </button>
        </div>
      </section>

      {editProfileOpen && user && (
        <EditProfile
          person={user}
          onClose={() => {
            setEditProfileOpen(false);
          }}
        />
      )}

      {editUsernameOpen && user && (
        <UsernameModal
          currentUsername={user.username}
          people={people}
          userKey={user.localKey}
          onSave={(nextUsername) => {
            setPeople((current) =>
              current.map((item) =>
                item.localKey === user.localKey
                  ? { ...item, username: nextUsername }
                  : item,
              ),
            );
            showToast(`Nama pengguna diubah menjadi @${nextUsername}.`, "success");
          }}
          onClose={() => setEditUsernameOpen(false)}
        />
      )}

      {user && (
        <LocationSelectorModal
          isOpen={regionModalOpen}
          selectedLocation={user.region}
          onClose={() => setRegionModalOpen(false)}
          onSelect={(loc) => {
            setPeople((current) =>
              current.map((item) =>
                item.localKey === user.localKey
                  ? { ...item, region: loc }
                  : item,
              ),
            );
            showToast(`Wilayah diperbarui ke ${loc}.`, "success");
          }}
        />
      )}

      {mutedWordsOpen && (
        <MutedWordsModal
          words={workspace.mutedWords}
          onAdd={(word) => {
            const exists = workspace.mutedWords.some(
              (item) => item.toLowerCase() === word.toLowerCase(),
            );
            if (exists) return;
            updatePreference(
              "mutedWords",
              [...workspace.mutedWords, word],
              `Kata "${word}" ditambahkan ke daftar bisu.`,
            );
          }}
          onRemove={(word) =>
            updatePreference(
              "mutedWords",
              workspace.mutedWords.filter((item) => item !== word),
              `Kata "${word}" dihapus dari daftar bisu.`,
            )
          }
          onClose={() => setMutedWordsOpen(false)}
        />
      )}

      {mutedUsersOpen && (
        <AccountListModal
          title="Akun yang dibisukan"
          description="Postingan akun yang dibisukan tidak ditampilkan di beranda."
          emptyText="Belum ada akun yang dibisukan."
          activeLabel="Bunyikan"
          inactiveLabel="Bisukan"
          people={people}
          selfKey={user?.localKey}
          selectedKeys={workspace.mutedUsers}
          onToggle={(personKey, nextActive) =>
            updatePreference(
              "mutedUsers",
              nextActive
                ? [...workspace.mutedUsers, personKey]
                : workspace.mutedUsers.filter((k) => k !== personKey),
              nextActive
                ? "Akun ditambahkan ke daftar bisu."
                : "Akun dihapus dari daftar bisu.",
            )
          }
          onClose={() => setMutedUsersOpen(false)}
        />
      )}

      {blockedUsersOpen && (
        <AccountListModal
          title="Akun yang diblokir"
          description="Akun yang diblokir tidak dapat berinteraksi dengan kontenmu."
          emptyText="Belum ada akun yang diblokir."
          activeLabel="Buka blokir"
          inactiveLabel="Blokir"
          people={people}
          selfKey={user?.localKey}
          selectedKeys={workspace.blockedUsers}
          onToggle={(personKey, nextActive) =>
            updatePreference(
              "blockedUsers",
              nextActive
                ? [...workspace.blockedUsers, personKey]
                : workspace.blockedUsers.filter((k) => k !== personKey),
              nextActive
                ? "Akun ditambahkan ke daftar blokir."
                : "Blokir akun dibuka.",
            )
          }
          onClose={() => setBlockedUsersOpen(false)}
        />
      )}

      {topicsOpen && (
        <PreferredTopicsModal
          selectedTopics={workspace.preferredTopics}
          onToggleTopic={(topicName) => {
            const exists = workspace.preferredTopics.includes(topicName);
            updatePreference(
              "preferredTopics",
              exists
                ? workspace.preferredTopics.filter((item) => item !== topicName)
                : [...workspace.preferredTopics, topicName],
              "Minat topik diperbarui.",
            );
          }}
          onClose={() => setTopicsOpen(false)}
        />
      )}

      {dangerConfirm === "delete_posts" && (
        <ConfirmDangerModal
          title="Hapus semua postingan?"
          message="Seluruh postingan dan balasan yang dibuat oleh akun ini pada sesi demo akan dihapus permanen."
          confirmLabel="Hapus postingan"
          onConfirm={() => {
            if (user) {
              setPosts((current) =>
                current.map((post) => ({
                  ...post,
                  isDeleted:
                    post.authorKey === user.localKey ? true : post.isDeleted,
                  replies: post.replies.filter(
                    (reply) => reply.authorKey !== user.localKey,
                  ),
                })),
              );
            }
            setDangerConfirm(null);
            showToast(
              "Seluruh postingan & balasan sesi ini telah dihapus.",
              "success",
            );
          }}
          onClose={() => setDangerConfirm(null)}
        />
      )}

      {dangerConfirm === "delete_account" && (
        <ConfirmDangerModal
          title="Hapus akun sesi demo?"
          message="Aksi ini mereset seluruh data sesi demo dan mengarahkanmu kembali ke halaman masuk."
          confirmLabel="Hapus akun"
          onConfirm={() => {
            setDangerConfirm(null);
            logout();
            router.push("/login");
          }}
          onClose={() => setDangerConfirm(null)}
        />
      )}
    </ProductShell>
  );
}
