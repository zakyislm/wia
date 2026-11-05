"use client";
import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
export function Notifications() {
  const { workspace, setWorkspace, people, posts } = useDemo();
  const [unread, setUnread] = useState(false);
  const items = [
    {
      key: "evidence",
      actor: "pupr",
      title: "Dinas PUPR mengajukan penyelesaian",
      body: "Lihat bukti dan ikut menilai hasilnya.",
      href: "/posts/trotoar-merdeka#evidence",
      group: "reports",
    },
    {
      key: "reply",
      actor: "komunitas",
      title: "Balasan baru dalam percakapan",
      body: "Percakapan warga terus berlanjut.",
      href: "/posts/trotoar-merdeka",
      group: "social",
    },
    {
      key: "closed",
      actor: "pupr",
      title: "Validasi selesai · Laporan Closed",
      body: "Lihat bukti, hasil validasi dan riwayat percakapan.",
      href: "/posts/contoh-success#evidence",
      group: "reports",
    },
    {
      key: "follow",
      actor: "nadia",
      title: "Nadia mulai mengikutimu",
      body: "Temukan cerita dan suara baru.",
      href: "/profile/nadia",
      group: "social",
    },
  ].filter(
    (item) =>
      (item.group === "social"
        ? workspace.notificationSocial
        : workspace.notificationReports) &&
      (!unread || !workspace.readNotifications.includes(item.key)) &&
      (!item.href.startsWith("/posts/") ||
        posts.some((post) => item.href.includes(post.localKey))),
  );
  function read(key: string) {
    setWorkspace((current) => ({
      ...current,
      readNotifications: [...new Set([...current.readNotifications, key])],
    }));
  }
  return (
    <ProductShell title="Notifikasi" active="notifications">
      <section className="feed-surface">
        <div className="list-toolbar">
          <div
            className="simple-tabs"
            role="tablist"
            aria-label="Filter notifikasi"
          >
            <button
              role="tab"
              aria-selected={!unread}
              onClick={() => setUnread(false)}
            >
              Semua
            </button>
            <button
              role="tab"
              aria-selected={unread}
              onClick={() => setUnread(true)}
            >
              Belum dibaca
            </button>
          </div>
          <Button
            variant="ghost"
            onClick={() =>
              setWorkspace((current) => ({
                ...current,
                readNotifications: ["evidence", "reply", "closed", "follow"],
              }))
            }
          >
            Tandai semua dibaca
          </Button>
        </div>
        {items.map((item) => {
          const actor = people.find(
            (person) => person.localKey === item.actor,
          )!;
          return (
            <Link
              href={item.href}
              key={item.key}
              onClick={() => read(item.key)}
              className={`notification-row ${workspace.readNotifications.includes(item.key) ? "" : "is-unread"}`}
            >
              <Avatar name={actor.name} src={actor.image} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <small className="muted">Contoh notifikasi</small>
              </div>
              {!workspace.readNotifications.includes(item.key) && (
                <span className="unread-dot" aria-label="Belum dibaca" />
              )}
            </Link>
          );
        })}
        {!items.length && (
          <div className="empty-state">
            <h2>Semua sudah terbaca</h2>
            <p>
              Notifikasi baru akan muncul di sini. Preferensi dapat diubah di
              Pengaturan.
            </p>
            <Link href="/settings">Buka pengaturan →</Link>
          </div>
        )}
      </section>
    </ProductShell>
  );
}
