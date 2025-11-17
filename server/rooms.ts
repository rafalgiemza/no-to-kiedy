"use server";

import { db } from "@/db/drizzle";
import { room, roomParticipant } from "@/db/schema";
import { getCurrentUser } from "./users";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";

interface CreateRoomInput {
  title: string;
  meetingDuration: number;
  searchTimeframeStart: Date;
  searchTimeframeEnd: Date;
}

export async function createRoom(input: CreateRoomInput) {
  try {
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

    return {
      success: true,
      roomId,
      message: "Chat room created successfully",
    };
  } catch (error) {
    console.error("Error creating room:", error);
    return {
      success: false,
      message: "Failed to create chat room",
    };
  }
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

export async function getMyRooms() {
  const { currentUser } = await getCurrentUser();

  // Find all room participants where the user is a participant
  const participants = await db.query.roomParticipant.findMany({
    where: eq(roomParticipant.userId, currentUser.id),
  });

  // Get the room IDs from participants
  const roomIds = participants.map((p) => p.roomId);

  if (roomIds.length === 0) {
    return [];
  }

  // Fetch all rooms where user is either owner or participant
  const rooms = await db.query.room.findMany({
    where: or(
      eq(room.ownerId, currentUser.id),
      ...roomIds.map((id) => eq(room.id, id))
    ),
    with: {
      owner: true,
      participants: {
        with: {
          user: true,
        },
      },
    },
  });

  return rooms;
}

export async function joinRoomAsParticipant(roomId: string) {
  const { currentUser } = await getCurrentUser();

  // Check if user is already a participant
  const existingParticipant = await db.query.roomParticipant.findFirst({
    where: (roomParticipant, { and, eq, isNull }) =>
      and(
        eq(roomParticipant.roomId, roomId),
        eq(roomParticipant.userId, currentUser.id),
        isNull(roomParticipant.leftAt)
      ),
  });

  // If already a participant, do nothing
  if (existingParticipant) {
    return;
  }

  // Add user as participant
  const participantId = crypto.randomUUID();
  const anonymizedHash = crypto
    .createHash("sha256")
    .update(`${roomId}-${currentUser.id}`)
    .digest("hex");

  await db.insert(roomParticipant).values({
    id: participantId,
    roomId,
    userId: currentUser.id,
    role: "participant",
    anonymizedHash,
    joinedAt: new Date(),
  });
}
