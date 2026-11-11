"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useDemo } from "@/features/auth/DemoProvider";
import { ProductShell } from "@/components/layout/ProductShell";
import { PostCard } from "./PostCard";
import { CommentThread } from "./CommentThread";

export function PostDetail({
  postKey,
  branchKey,
}: {
  postKey: string;
  branchKey?: string;
}) {
  const { posts, people } = useDemo();
  const post = posts.find(
    (item) => item.localKey === postKey && !item.isDeleted,
  );
  const backHref = branchKey ? `/posts/${postKey}` : "/home";
  const backLabel = branchKey ? "Kembali ke postingan" : "Kembali ke beranda";
  return (
    <ProductShell
      hideHeader
      title="Post"
      backHref={backHref}
      backLabel={backLabel}
    >
      <section className="feed-surface post-detail-surface">
        <Link
          href={backHref}
          className="post-detail-back-btn"
          aria-label={backLabel}
          title={backLabel}
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        {post ? (
          <>
            <PostCard post={post} detail />
            {branchKey &&
              post.replies.find((reply) => reply.localKey === branchKey) && (
                <div className="section-pad branch-context">
                  <strong>
                    {
                      people.find(
                        (person) =>
                          person.localKey ===
                          post.replies.find(
                            (reply) => reply.localKey === branchKey,
                          )?.authorKey,
                      )?.name
                    }
                  </strong>
                  <p>
                    {
                      post.replies.find((reply) => reply.localKey === branchKey)
                        ?.content
                    }
                  </p>
                </div>
              )}
            <CommentThread post={post} parentKey={branchKey} />
          </>
        ) : (
          <div className="empty-state">
            <h2>Postingan tidak tersedia</h2>
            <p>
              Data demo dapat hilang setelah refresh. Kembali ke beranda untuk
              memulai lagi.
            </p>
          </div>
        )}
      </section>
    </ProductShell>
  );
}
