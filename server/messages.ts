"use server";

import { db } from "@/db/drizzle";
import { message, roomParticipant } from "@/db/schema";
import { getCurrentUser } from "./users";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function getMessagesByRoomId(roomId: string) {
  const messages = await db.query.message.findMany({
    where: eq(message.roomId, roomId),
    with: {
      user: true,
    },
    orderBy: [desc(message.createdAt)],
  });

  // Return messages in chronological order (oldest first)
  return messages.reverse();
}

export async function sendMessage(roomId: string, content: string) {
  const { currentUser } = await getCurrentUser();

  // Verify user is a participant of the room
  const participants = await db.query.roomParticipant.findMany({
    where: eq(roomParticipant.roomId, roomId),
  });

  const isParticipant = participants.some((p) => p.userId === currentUser.id);

  if (!isParticipant) {
    throw new Error("You are not a participant of this room");
  }

  // Create message
  const messageId = crypto.randomUUID();
  await db.insert(message).values({
    id: messageId,
    roomId,
    userId: currentUser.id,
    role: "user",
    content,
    createdAt: new Date(),
  });

  // Revalidate the chat page to show the new message
  revalidatePath(`/chat/${roomId}`);

  return { success: true, messageId };
}
