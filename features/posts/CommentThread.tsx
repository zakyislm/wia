"use client";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useDemo } from "@/features/auth/DemoProvider";
import type { Post } from "@/types/models";

export function CommentThread({
  post,
  parentKey,
  depth = 0,
  onReply,
}: {
  post: Post;
  parentKey?: string;
  depth?: number;
  onReply?: (key: string) => void;
}) {
  const { people, user, updatePost } = useDemo();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const replies = post.replies.filter((reply) => reply.parentKey === parentKey);
  const root = depth === 0;
  function selectReply(key: string) {
    if (onReply) onReply(key);
    else setReplyTo(key);
    document
      .querySelector<HTMLTextAreaElement>(".comment-form textarea")
      ?.focus();
  }
  function send() {
    if (!text.trim() || !user) return;
    updatePost(post.localKey, (current) => ({
      ...current,
      replies: [
        ...current.replies,
        {
          id: "",
          postId: "",
          authorId: "",
          parentId: "",
          localKey: crypto.randomUUID(),
          authorKey: user.localKey,
          parentKey: replyTo ?? parentKey,
          content: text.trim(),
        },
      ],
    }));
    setText("");
    setReplyTo(undefined);
  }
  return (
    <div className={root ? "comments" : "comment-children"}>
      {root && (
        <>
          <h2>Percakapan</h2>
          <form
            className="comment-form"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label>
              {replyTo ? "Tulis balasan" : "Tambahkan komentar"}
              <textarea
                rows={2}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Bagikan tanggapanmu dengan hormat…"
              />
            </label>
            <div className="button-row">
              {replyTo && (
                <Button variant="ghost" onClick={() => setReplyTo(undefined)}>
                  Batal balas
                </Button>
              )}
              <Button type="submit" disabled={!text.trim()}>
                Kirim
              </Button>
            </div>
          </form>
        </>
      )}
      {!replies.length && root && (
        <p className="muted">
          Belum ada komentar pada cabang ini. Mulai percakapannya.
        </p>
      )}
      {replies.map((reply) => {
        const author = people.find(
          (person) => person.localKey === reply.authorKey,
        )!;
        const hidden = collapsed.includes(reply.localKey);
        const children = post.replies.some(
          (child) => child.parentKey === reply.localKey,
        );
        return (
          <article
            className={`comment ${children && !hidden && depth < 2 ? "comment--connected" : ""}`}
            id={`comment-${reply.localKey}`}
            key={reply.localKey}
          >
            <div className="comment-body">
              <div className="post-meta">
                <Avatar name={author.name} src={author.image} />
                <div>
                  <strong>
                    <Link href={`/profile/${author.localKey}`}>
                      {author.name}
                    </Link>
                    {author.role === "GOVERNMENT" ? " ✓" : ""}
                  </strong>
                  <small>@{author.username}</small>
                </div>
              </div>
              <p>{reply.content}</p>
              <div className="button-row">
                <Button
                  variant="ghost"
                  onClick={() => {
                    selectReply(reply.localKey);
                  }}
                >
                  Balas
                </Button>
                {children && (
                  <Button
                    variant="ghost"
                    aria-expanded={!hidden}
                    onClick={() =>
                      setCollapsed((current) =>
                        hidden
                          ? current.filter((key) => key !== reply.localKey)
                          : [...current, reply.localKey],
                      )
                    }
                  >
                    {hidden ? "Buka balasan" : "Lipat balasan"}
                  </Button>
                )}
              </div>
            </div>
            {children &&
              !hidden &&
              (depth >= 2 ? (
                <Link
                  className="agency-tags comment-continue"
                  href={`/posts/${post.localKey}/branch/${reply.localKey}`}
                >
                  Lanjutkan percakapan →
                </Link>
              ) : (
                <CommentThread
                  post={post}
                  parentKey={reply.localKey}
                  depth={depth + 1}
                  onReply={selectReply}
                />
              ))}
          </article>
        );
      })}
    </div>
  );
}
