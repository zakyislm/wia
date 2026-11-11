export type MessageRequestPolicy = "everyone" | "following" | "agencies";

export interface DemoMessage {
  id: "";
  authorId: "";
  localKey: string;
  outgoing: boolean;
  text: string;
  time: string;
  images?: string[];
}
export interface Conversation {
  id: "";
  localKey: string;
  partnerKey: string;
  unread?: boolean;
  messages: DemoMessage[];
}
export interface Workspace {
  readNotifications: string[];
  notificationSocial: boolean;
  notificationReports: boolean;
  notificationValidation: boolean;
  notificationEngagement: boolean;
  notificationMessages: boolean;
  notificationDigest: boolean;
  mutedWords: string[];
  mutedUsers: string[];
  blockedUsers: string[];
  preferredTopics: string[];
  showSensitiveReports: boolean;
  autoplayVideos: boolean;
  privacyMessageRequests: MessageRequestPolicy;
  privacyShowLikes: boolean;
  privacyAllowMentions: boolean;
  privacyDefaultAnonymous: boolean;
  conversations: Conversation[];
  verification: {
    id: "";
    status: "none" | "submitted";
    name: string;
    region: string;
    responsibility: string;
    channel: string;
    evidenceName: string;
  };
}
export function seedWorkspace(): Workspace {
  return {
    readNotifications: [],
    notificationSocial: true,
    notificationReports: true,
    notificationValidation: true,
    notificationEngagement: true,
    notificationMessages: true,
    notificationDigest: false,
    mutedWords: [],
    mutedUsers: [],
    blockedUsers: [],
    preferredTopics: [],
    showSensitiveReports: true,
    autoplayVideos: true,
    privacyMessageRequests: "everyone",
    privacyShowLikes: true,
    privacyAllowMentions: true,
    privacyDefaultAnonymous: false,
    conversations: [
      {
        id: "",
        localKey: "nadia",
        partnerKey: "nadia",
        unread: true,
        messages: [
          {
            id: "",
            authorId: "",
            localKey: "hello-nadia",
            outgoing: false,
            text: "Besok jadi ikut kegiatan taman?",
            time: "10.20",
          },
        ],
      },
      {
        id: "",
        localKey: "komunitas",
        partnerKey: "komunitas",
        unread: true,
        messages: [
          {
            id: "",
            authorId: "",
            localKey: "hello-community",
            outgoing: false,
            text: "Halo! Ada ide kegiatan warga untuk akhir pekan ini?",
            time: "09.45",
          },
        ],
      },
      {
        id: "",
        localKey: "dishub",
        partnerKey: "dishub",
        unread: false,
        messages: [
          {
            id: "",
            authorId: "",
            localKey: "sent-dishub",
            outgoing: true,
            text: "Terima kasih atas perbaikan lampu PJU di perempatan Jl. Riau.",
            time: "Kemarin",
          },
        ],
      },
    ],
    verification: {
      id: "",
      status: "none",
      name: "",
      region: "",
      responsibility: "",
      channel: "",
      evidenceName: "",
    },
  };
}
