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
