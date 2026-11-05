"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Plus, ArrowLeft, Send } from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog } from "@/components/ui/Dialog";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
export function Messages({ selectedKey }: { selectedKey?: string }) {
  const { user, people, workspace, setWorkspace } = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [newMessage, setNew] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const conversations = workspace.conversations.filter(
    (item) => item.partnerKey !== user?.localKey,
  );
  const selected = conversations.find((item) => item.localKey === selectedKey);
  const partner = people.find(
    (person) => person.localKey === selected?.partnerKey,
  );
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [selected?.messages.length]);
  const filtered = conversations.filter((item) => {
    const person = people.find((p) => p.localKey === item.partnerKey);
    return `${person?.name} ${item.messages.at(-1)?.text ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase());
  });
  function open(partnerKey: string) {
    if (!workspace.conversations.some((item) => item.partnerKey === partnerKey))
      setWorkspace((current) => ({
        ...current,
        conversations: [
          { id: "", localKey: partnerKey, partnerKey, messages: [] },
          ...current.conversations,
        ],
      }));
    setNew(false);
    setRecipientQuery("");
    router.push(`/messages/${partnerKey}`);
  }
  return (
    <ProductShell title="Obrolan" active="messages" wide>
      <div className={`messaging ${selectedKey ? "has-conversation" : ""}`}>
        <section className="conversation-list" aria-label="Daftar percakapan">
          <header className="chat-list-header">
            <h1>Obrolan</h1>
            <div>
              <ThemeToggle />
              <Button
                variant="ghost"
                aria-label="Pesan baru"
                onClick={() => setNew(true)}
              >
                <Plus />
              </Button>
            </div>
          </header>
          <label className="chat-search">
            <span className="sr-only">Cari percakapan</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari percakapan"
            />
          </label>
          <p className="small muted section-pad">Pesan pribadi</p>
          {filtered.map((item) => {
            const person = people.find((p) => p.localKey === item.partnerKey)!;
            return (
              <Link
                className={`conversation-item ${selectedKey === item.localKey ? "selected" : ""}`}
                href={`/messages/${item.localKey}`}
                key={item.localKey}
              >
                <Avatar name={person.name} src={person.image} />
                <div>
                  <strong>{person.name}</strong>
                  <p>{item.messages.at(-1)?.text ?? "Mulai percakapan"}</p>
                  <small>{item.messages.at(-1)?.time ?? ""}</small>
                </div>
              </Link>
            );
          })}
          {!filtered.length && (
            <div className="empty-state">
              <p>
                {query
                  ? "Tidak ada percakapan yang cocok."
                  : "Belum ada percakapan."}
              </p>
              <Button onClick={() => setNew(true)}>Mulai pesan</Button>
            </div>
          )}
        </section>
        <section className="conversation-pane" aria-label="Isi percakapan">
          {selected && partner ? (
            <>
              <header className="conversation-header">
                <Link
                  className="chat-back button button--ghost"
                  href="/messages"
                  aria-label="Kembali ke daftar percakapan"
                >
                  <ArrowLeft />
                </Link>
                <Avatar name={partner.name} src={partner.image} />
                <Link href={`/profile/${partner.localKey}`}>
                  <strong>{partner.name}</strong>
                </Link>
              </header>
              <div className="message-history">
                <p className="chat-demo-label">
                  Pratinjau lokal · Pesan tidak dikirim ke pengguna lain
                </p>
                {selected.messages.map((message) => (
                  <div
                    key={message.localKey}
                    className={`message-bubble ${message.outgoing ? "outgoing" : ""}`}
                  >
                    <p>{message.text}</p>
                    <small>
                      {message.time}
                      {message.outgoing ? " · Demo" : ""}
                    </small>
                  </div>
                ))}
                {!selected.messages.length && (
                  <p className="muted">Sampaikan sapaan pertamamu.</p>
                )}
                <div ref={bottom} />
              </div>
              <form
                className="message-editor"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!text.trim()) return;
                  const content = text.trim();
                  setWorkspace((current) => ({
                    ...current,
                    conversations: current.conversations.map((item) =>
                      item.localKey === selected.localKey
                        ? {
                            ...item,
                            messages: [
                              ...item.messages,
                              {
                                id: "",
                                authorId: "",
                                localKey: crypto.randomUUID(),
                                outgoing: true,
                                text: content,
                                time: new Date().toLocaleTimeString("id-ID", {
                                  timeZone: "Asia/Jakarta",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }),
                              },
                            ],
                          }
                        : item,
                    ),
                  }));
                  setText("");
                }}
              >
                <label>
                  <span className="sr-only">Tulis pesan</span>
                  <textarea
                    rows={1}
                    maxLength={4000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Tulis pesan…"
                  />
                </label>
                <Button
                  type="submit"
                  aria-label="Kirim pesan"
                  disabled={!text.trim()}
                >
                  <Send />
                </Button>
              </form>
            </>
          ) : (
            <div className="empty-state chat-empty">
              <h2>
                {selectedKey ? "Percakapan tidak tersedia" : "Pilih percakapan"}
              </h2>
              <p>
                {selectedKey
                  ? "Kembali ke daftar atau mulai percakapan baru."
                  : "Mulai percakapan dengan memilih akun di daftar."}
              </p>
              <Link href="/messages">Lihat daftar percakapan</Link>
              <Button onClick={() => setNew(true)}>Pesan baru</Button>
            </div>
          )}
        </section>
      </div>
      {newMessage && (
        <Dialog title="Pesan baru" onClose={() => setNew(false)}>
          <div className="dialog-body">
            <label>
              Cari penerima
              <input
                type="search"
                value={recipientQuery}
                onChange={(e) => setRecipientQuery(e.target.value)}
                placeholder="Nama atau username"
                autoFocus
              />
            </label>
            {people
              .filter(
                (person) =>
                  person.localKey !== user?.localKey &&
                  `${person.name} ${person.username}`
                    .toLowerCase()
                    .includes(recipientQuery.toLowerCase()),
              )
              .map((person) => (
                <button
                  className="recipient-option"
                  key={person.localKey}
                  onClick={() => open(person.localKey)}
                >
                  <Avatar name={person.name} src={person.image} />
                  <span>
                    <strong>{person.name}</strong>
                    <small>@{person.username}</small>
                  </span>
                </button>
              ))}
            {!people.some(
              (person) =>
                person.localKey !== user?.localKey &&
                `${person.name} ${person.username}`
                  .toLowerCase()
                  .includes(recipientQuery.toLowerCase()),
            ) && <p className="muted">Tidak ada akun yang cocok.</p>}
          </div>
        </Dialog>
      )}
    </ProductShell>
  );
}
