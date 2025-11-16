"use server";

import { db } from "@/db/drizzle";
import {
  room,
  roomParticipant,
  message,
  analysis,
  parsedAvailability,
  timeSlotProposal,
} from "@/db/schema";
import { getCurrentUser } from "./users";
import { eq, desc, and, isNull } from "drizzle-orm";
import crypto from "crypto";
import { OpenRouterService } from "@/utils/open-router";
import { systemPrompt, userPrompt } from "@/utils/atropic/chat-parser/prompts";
import { findCommonAvailability, TimeSlot } from "@/utils/intersect";
import { generateICS } from "@/utils/ics-generator";

const openRouter = new OpenRouterService();

interface ParticipantAvailability {
  user_id: string;
  availability: {
    start: string;
    end: string;
  }[];
}

interface AnalysisResponse {
  event: {
    event_id: string;
    minDurationInMinutes: number;
    participantWithAvailability: ParticipantAvailability[];
  };
}

/**
 * US-008: Analyze room availability and find common time slots
 * Only the room owner (Organizer) can trigger this action
 */
export async function analyzeAvailability(roomId: string) {
  const { currentUser } = await getCurrentUser();

  // Fetch room data
  const roomData = await db.query.room.findFirst({
    where: eq(room.id, roomId),
    with: {
      owner: true,
      participants: {
        where: isNull(roomParticipant.leftAt),
        with: {
          user: true,
        },
      },
    },
  });

  if (!roomData) {
    throw new Error("Room not found");
  }

  // Verify that current user is the owner (US-008 requirement)
  if (roomData.ownerId !== currentUser.id) {
    throw new Error("Only the room owner can initiate analysis");
  }

  // Verify room is still active
  if (roomData.status !== "active") {
    throw new Error("Room is not active");
  }

  // Fetch ALL messages to ensure full context (users may change their minds)
  // We always analyze the entire chat history, not just new messages
  const messages = await db.query.message.findMany({
    where: eq(message.roomId, roomId),
    with: {
      user: true,
    },
    orderBy: [desc(message.createdAt)],
    limit: 200,
  });

  // Reverse to get chronological order (oldest first)
  const chronologicalMessages = messages.reverse();

  // Create a map of userId to anonymizedHash
  const userIdToHash = new Map<string, string>();
  roomData.participants.forEach((participant) => {
    userIdToHash.set(participant.userId, participant.anonymizedHash);
  });

  // Transform messages to chat format with anonymized IDs
  const chatMessages = chronologicalMessages
    .filter((msg) => msg.userId && msg.role === "user") // Only user messages
    .map((msg) => ({
      userId: userIdToHash.get(msg.userId!) || "unknown",
      timestamp: msg.createdAt.toISOString(),
      content: msg.content,
    }));

  // Prepare context for AI (US-008 requirements)
  const now = new Date();
  const timezone = "Europe/Warsaw";

  // Format dates in ISO 8601 with timezone
  const dateFrom = roomData.searchTimeframeStart.toISOString();
  const dateTo = roomData.searchTimeframeEnd.toISOString();

  console.log("=== ANALYSIS CONTEXT ===");
  console.log("Room ID:", roomId);
  console.log("Event ID:", roomId);
  console.log("Current Date/Time:", now.toISOString());
  console.log("Timezone:", timezone);
  console.log("Search Timeframe:", `${dateFrom} to ${dateTo}`);
  console.log("Meeting Duration:", roomData.meetingDuration, "minutes");
  console.log(
    "Messages:",
    chatMessages.map((m) => m)
  );
  console.log("Active Participants:", roomData.participants.length);
  console.log("========================");

  try {
    // Call OpenRouter API to parse availability
    const response = await openRouter.complete<AnalysisResponse>({
      messages: [
        {
          role: "system",
          content: systemPrompt({
            event_id: roomId,
            dateFrom,
            dateTo,
            minDurationInMinutes: roomData.meetingDuration,
          }),
        },
        {
          role: "user",
          content: userPrompt({
            chatMessages,
            event_id: roomId,
            dateFrom,
            dateTo,
            minDurationInMinutes: roomData.meetingDuration,
          }),
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "availability_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              event: {
                type: "object",
                properties: {
                  event_id: { type: "string" },
                  minDurationInMinutes: { type: "number" },
                  participantWithAvailability: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        user_id: { type: "string" },
                        availability: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              start: { type: "string" },
                              end: { type: "string" },
                            },
                            required: ["start", "end"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["user_id", "availability"],
                      additionalProperties: false,
                    },
                  },
                },
                required: [
                  "event_id",
                  "minDurationInMinutes",
                  "participantWithAvailability",
                ],
                additionalProperties: false,
              },
            },
            required: ["event"],
            additionalProperties: false,
          },
        },
      },
    });

    // Log the response
    console.log("=== AI RESPONSE ===");
    console.log(JSON.stringify(response.choices[0].message.parsed, null, 2));
    console.log("===================");

    const analysisResult = response.choices[0].message.parsed;

    if (!analysisResult) {
      throw new Error("No parsed result from AI");
    }

    // Transform AI response to format expected by findCommonAvailability
    // allSchedules should be an array of arrays of {start, end}
    const allSchedules = analysisResult.event.participantWithAvailability.map(
      (participant) => participant.availability
    );

    // Convert meeting duration from minutes to milliseconds
    const minDurationMs = roomData.meetingDuration * 60 * 1000;

    console.log("=== FINDING COMMON AVAILABILITY ===");
    console.log("Participants with availability:", allSchedules.length);
    console.log("Min duration (ms):", minDurationMs);

    // Find common time slots
    const commonSlots = findCommonAvailability({
      allSchedules,
      minDurationMs,
    });

    console.log("=== FOUND COMMON SLOTS ===");
    console.log(JSON.stringify(commonSlots, null, 2));
    console.log("Total slots found:", commonSlots.length);
    console.log("===========================");

    // Get the last message ID for tracking
    const lastMessageId =
      chronologicalMessages.length > 0
        ? chronologicalMessages[chronologicalMessages.length - 1].id
        : undefined;

    // Save analysis results to database
    const { analysisId } = await saveAnalysisResults({
      roomId,
      analysisResult,
      commonSlots,
      rawApiResponse: response,
      sentMessagesCount: chatMessages.length,
      lastMessageId,
    });

    return {
      success: true,
      data: {
        analysisId,
        parsedAvailability: analysisResult,
        commonSlots,
        participantsCount: allSchedules.length,
        meetingDuration: roomData.meetingDuration,
      },
    };
  } catch (error) {
    console.error("=== ANALYSIS ERROR ===");
    console.error(error);
    console.error("=====================");

    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Save analysis results to the database
 * Stores analysis metadata, parsed availabilities, and proposed time slots
 */
export async function saveAnalysisResults(params: {
  roomId: string;
  analysisResult: AnalysisResponse;
  commonSlots: TimeSlot[];
  rawApiResponse: any;
  sentMessagesCount: number;
  lastMessageId?: string;
}) {
  const { currentUser } = await getCurrentUser();

  // 1. Create analysis record
  const analysisId = crypto.randomUUID();

  // Determine status based on results
  let status: "success" | "partial_success" | "no_slots_found" = "success";
  if (params.commonSlots.length === 0) {
    status = "no_slots_found";
  }

  const totalParticipants =
    params.analysisResult.event.participantWithAvailability.length;

  // Count total individual slots found
  const totalSlotsFound =
    params.analysisResult.event.participantWithAvailability.reduce(
      (sum, participant) => sum + participant.availability.length,
      0
    );

  await db.insert(analysis).values({
    id: analysisId,
    roomId: params.roomId,
    triggeredById: currentUser.id,
    status,
    sentMessagesCount: params.sentMessagesCount,
    contextData: {
      event_id: params.analysisResult.event.event_id,
      minDurationInMinutes: params.analysisResult.event.minDurationInMinutes,
      participantsCount: totalParticipants,
    },
    rawApiResponse: params.rawApiResponse,
    aiModel: "claude-sonnet-4",
    totalSlotsFound: params.commonSlots.length,
    proposedSlotsCount: Math.min(params.commonSlots.length, 3),
    completedAt: new Date(),
  });

  // 2. Save parsed availability slots for each participant
  const parsedAvailabilities = [];
  for (const participant of params.analysisResult.event
    .participantWithAvailability) {
    for (const slot of participant.availability) {
      parsedAvailabilities.push({
        id: crypto.randomUUID(),
        analysisId,
        anonymizedUserId: participant.user_id,
        slotStart: new Date(slot.start),
        slotEnd: new Date(slot.end),
        confidence: "high",
      });
    }
  }

  if (parsedAvailabilities.length > 0) {
    await db.insert(parsedAvailability).values(parsedAvailabilities);
  }

  // 3. Save proposed common time slots (top 3)
  const proposals = [];
  const allParticipantIds =
    params.analysisResult.event.participantWithAvailability.map(
      (p) => p.user_id
    );

  for (let i = 0; i < Math.min(params.commonSlots.length, 3); i++) {
    const slot = params.commonSlots[i];
    proposals.push({
      id: crypto.randomUUID(),
      analysisId,
      proposedStart: new Date(slot.start),
      proposedEnd: new Date(slot.end),
      matchingParticipantsCount: totalParticipants,
      totalParticipantsCount: totalParticipants,
      isPartialMatch: false,
      matchingUserHashes: allParticipantIds,
      missingUserHashes: [],
      rank: i + 1,
    });
  }

  if (proposals.length > 0) {
    await db.insert(timeSlotProposal).values(proposals);
  }

  // 4. Update room's lastAnalysisMessageId if provided
  if (params.lastMessageId) {
    await db
      .update(room)
      .set({ lastAnalysisMessageId: params.lastMessageId })
      .where(eq(room.id, params.roomId));
  }

  console.log("=== ANALYSIS SAVED TO DATABASE ===");
  console.log("Analysis ID:", analysisId);
  console.log("Status:", status);
  console.log("Parsed Availabilities:", parsedAvailabilities.length);
  console.log("Proposed Slots:", proposals.length);
  console.log("===================================");

  return { analysisId };
}

/**
 * Get the latest analysis results for a room
 * Returns the most recent analysis with proposed time slots
 */
export async function getLatestAnalysisResults(roomId: string) {
  // Get the latest completed analysis for this room
  const latestAnalysis = await db.query.analysis.findFirst({
    where: and(eq(analysis.roomId, roomId), eq(analysis.status, "success")),
    orderBy: [desc(analysis.createdAt)],
    with: {
      proposedSlots: {
        orderBy: [desc(timeSlotProposal.rank)],
      },
    },
  });

  if (!latestAnalysis || !latestAnalysis.proposedSlots.length) {
    return null;
  }

  // Transform to the format expected by the UI
  const commonSlots = latestAnalysis.proposedSlots.map((slot) => ({
    id: slot.id, // Include proposal ID for finalization
    start: slot.proposedStart.toISOString(),
    end: slot.proposedEnd.toISOString(),
    isSelected: slot.isSelected, // Include selection status
  }));

  const contextData = latestAnalysis.contextData as {
    participantsCount?: number;
    minDurationInMinutes?: number;
  };

  return {
    analysisId: latestAnalysis.id,
    commonSlots,
    participantsCount: contextData?.participantsCount || 0,
    meetingDuration: contextData?.minDurationInMinutes || 0,
  };
}

/**
 * US-010: Finalize a selected time slot
 * Marks the room as COMPLETED and generates .ics file
 * Only the room owner can finalize
 */
export async function finalizeTimeSlot(roomId: string, proposalId: string) {
  const { currentUser } = await getCurrentUser();

  // 1. Fetch room data with participants
  const roomData = await db.query.room.findFirst({
    where: eq(room.id, roomId),
    with: {
      owner: true,
      participants: {
        where: isNull(roomParticipant.leftAt),
        with: {
          user: true,
        },
      },
    },
  });

  if (!roomData) {
    throw new Error("Room not found");
  }

  // 2. Verify that current user is the owner (US-010 requirement)
  if (roomData.ownerId !== currentUser.id) {
    throw new Error("Only the room owner can finalize the meeting");
  }

  // 3. Verify room is still active
  if (roomData.status !== "active") {
    throw new Error("Room is not active");
  }

  // 4. Get the time slot proposal
  const proposal = await db.query.timeSlotProposal.findFirst({
    where: eq(timeSlotProposal.id, proposalId),
  });

  if (!proposal) {
    throw new Error("Time slot proposal not found");
  }

  // 5. Generate .ics file content
  const icsContent = generateICS({
    title: roomData.title || "Meeting",
    startTime: proposal.proposedStart,
    endTime: proposal.proposedEnd,
    description: `Meeting scheduled via No to kiedy`,
    organizerEmail: roomData.owner.email,
    organizerName: roomData.owner.name || "Organizer",
    attendees: roomData.participants.map((p) => ({
      email: p.user.email,
      name: p.user.name || p.user.email,
    })),
  });

  const now = new Date();

  // 6. Update room with finalized slot
  await db
    .update(room)
    .set({
      finalizedSlotStart: proposal.proposedStart,
      finalizedSlotEnd: proposal.proposedEnd,
      finalizedAt: now,
      status: "completed",
      completedAt: now,
      updatedAt: now,
      // Store ICS content as a data URL for now (simple solution for MVP)
      // In production, upload to S3/cloud storage
      icsFileUrl: `data:text/calendar;base64,${Buffer.from(icsContent).toString("base64")}`,
    })
    .where(eq(room.id, roomId));

  // 7. Mark proposal as selected
  await db
    .update(timeSlotProposal)
    .set({ isSelected: true })
    .where(eq(timeSlotProposal.id, proposalId));

  console.log("=== MEETING FINALIZED ===");
  console.log("Room ID:", roomId);
  console.log("Proposal ID:", proposalId);
  console.log("Selected Slot:", proposal.proposedStart, "to", proposal.proposedEnd);
  console.log("Status changed to: completed");
  console.log("========================");

  return {
    success: true,
    data: {
      finalizedSlotStart: proposal.proposedStart,
      finalizedSlotEnd: proposal.proposedEnd,
      icsContent,
    },
  };
}
