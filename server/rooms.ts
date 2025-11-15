"use server";

import { db } from "@/db/drizzle";
import { room, roomParticipant } from "@/db/schema";
import { getCurrentUser } from "./users";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import crypto from "crypto";

interface CreateRoomInput {
  title: string;
  meetingDuration: number;
  searchTimeframeStart: Date;
  searchTimeframeEnd: Date;
}

export async function createRoom(input: CreateRoomInput) {
  const { currentUser } = await getCurrentUser();

  // Generate unique invite code
  const inviteCode = crypto.randomBytes(8).toString("hex");

  // Generate room ID
  const roomId = crypto.randomUUID();

  // Create room
  await db.insert(room).values({
    id: roomId,
    title: input.title,
    ownerId: currentUser.id,
    meetingDuration: input.meetingDuration,
    searchTimeframeStart: input.searchTimeframeStart,
    searchTimeframeEnd: input.searchTimeframeEnd,
    inviteCode,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Add owner as participant with owner role
  const participantId = crypto.randomUUID();
  const anonymizedHash = crypto
    .createHash("sha256")
    .update(`${roomId}-${currentUser.id}`)
    .digest("hex");

  await db.insert(roomParticipant).values({
    id: participantId,
    roomId,
    userId: currentUser.id,
    role: "owner",
    anonymizedHash,
    joinedAt: new Date(),
  });

  redirect(`/chat/${roomId}`);
}

export async function getRoomById(roomId: string) {
  const roomData = await db.query.room.findFirst({
    where: eq(room.id, roomId),
    with: {
      owner: true,
      participants: {
        with: {
          user: true,
        },
      },
    },
  });

  return roomData;
}
