export type Role = "USER" | "GOVERNMENT" | "INTERNAL";
export type Vote = "UP" | "DOWN" | null;
export type ReportStatus =
  | "waiting"
  | "in_progress"
  | "completed"
  | "closed_internal";

export interface Topic {
  id: string;
  name: string;
  slug: string;
  isTrending?: boolean;
}

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
  postedAt?: number;
  images?: string[];
  location?: string;
  is_action_taken?: boolean;
  actionRole?: "GOVERNMENT" | "INTERNAL";
  actionTakenAt?: number;
  upvotesCount?: number;
  downvotesCount?: number;
  vote?: Vote;
  reposted?: boolean;
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
  topicId: string;
  topicSlug?: string;
  topicName?: string;
  localKey: string;
  authorKey: string;
  postedAt: number;
  kind: "general" | "report";
  reportStatus?: ReportStatus;
  closedByKey?: string;
  closedByRole?: "GOVERNMENT" | "INTERNAL";
  closedAt?: number;
  pendingTakeActionRole?: "GOVERNMENT" | "INTERNAL" | null;
  anonymous: boolean;
  content: string;
  province: string;
  category: string;
  tags?: string[];
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
