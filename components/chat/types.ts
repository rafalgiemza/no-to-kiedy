import { Message, User } from "@/db/schema";

export type MessageWithUser = Message & {
  user: User | null;
};

export type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
};
