export type Role = "USER" | "GOVERNMENT" | "INTERNAL";
export type Vote = "UP" | "DOWN" | null;
export interface Person {
  id: "";
  localKey: string;
  name: string;
  username: string;
  role: Role;
  bio: string;
  region?: string;
  image?: string;
}
export interface Reply {
  id: "";
  localKey: string;
  authorId: "";
  postId: "";
  parentId: "";
  authorKey: string;
  parentKey?: string;
  content: string;
}
export interface Resolution {
  id: "";
  localKey: string;
  agencyKey: string;
  content: string;
  images: string[];
  deadline: number;
  agree: number;
  disagree: number;
  choice: "agree" | "disagree" | null;
}
export interface Post {
  id: "";
  authorId: "";
  topicId: "";
  localKey: string;
  authorKey: string;
  postedAt: number;
  kind: "general" | "report";
  anonymous: boolean;
  content: string;
  province: string;
  category: string;
  agencyKeys: string[];
  images: string[];
  upvotesCount: number;
  vote: Vote;
  reposted: boolean;
  saved?: boolean;
  hidden?: boolean;
  isDeleted?: boolean;
  replies: Reply[];
  resolutions: Resolution[];
}
