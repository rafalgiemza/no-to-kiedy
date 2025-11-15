import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at").notNull(),
  metadata: text("metadata"),
});

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
}));

export type Organization = typeof organization.$inferSelect;

export const role = pgEnum("role", ["member", "admin", "owner"]);

export type Role = (typeof role.enumValues)[number];

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: role("role").default("member").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export type Member = typeof member.$inferSelect & {
  user: typeof user.$inferSelect;
};

export type User = typeof user.$inferSelect;

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const roomStatus = pgEnum("room_status", [
  "active",
  "completed",
  "archived",
]);
export const messageRole = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);
export const participantRole = pgEnum("participant_role", [
  "owner",
  "participant",
]);
export const analysisStatus = pgEnum("analysis_status", [
  "processing",
  "success",
  "partial_success",
  "no_slots_found",
  "error",
]);

// ============================================================================
// POKÓJ (1 pokój = 1 spotkanie do ustalenia)
// ============================================================================

export const room = pgTable("room", {
  id: text("id").primaryKey(),
  title: text("title"),

  // Właściciel pokoju (Organizator)
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade",
  }),

  // Parametry spotkania (US-003)
  meetingDuration: integer("meeting_duration").notNull(), // w minutach, np. 30, 60, 120

  // Ramy czasowe szukania (US-003)
  searchTimeframeStart: timestamp("search_timeframe_start").notNull(),
  searchTimeframeEnd: timestamp("search_timeframe_end").notNull(),
  searchTimeOfDayStart: text("search_time_of_day_start"), // np. "09:00" (opcjonalne)
  searchTimeOfDayEnd: text("search_time_of_day_end"), // np. "17:00" (opcjonalne)

  // Status pokoju
  status: roomStatus("status").default("active").notNull(),

  // Link do zaproszenia (US-004)
  inviteCode: text("invite_code").notNull().unique(), // krótki kod do URL

  // Ostatnia wiadomość użyta w analizie (US-008)
  lastAnalysisMessageId: text("last_analysis_message_id"),

  // Finalizacja (US-010)
  finalizedSlotStart: timestamp("finalized_slot_start"),
  finalizedSlotEnd: timestamp("finalized_slot_end"),
  finalizedAt: timestamp("finalized_at"),
  icsFileUrl: text("ics_file_url"), // URL do pobranego pliku .ics

  // Metadata
  completedAt: timestamp("completed_at"), // dla retencji (US-014)
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// ============================================================================
// UCZESTNICY POKOJU
// ============================================================================

export const roomParticipant = pgTable("room_participant", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => room.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: participantRole("role").default("participant").notNull(),

  // Anonimizacja dla AI (US-008)
  anonymizedHash: text("anonymized_hash").notNull(), // SHA-256 hash per-room

  joinedAt: timestamp("joined_at")
    .$defaultFn(() => new Date())
    .notNull(),
  leftAt: timestamp("left_at"), // jeśli użytkownik opuści pokój
});

// ============================================================================
// WIADOMOŚCI W CZACIE (US-006, US-007)
// ============================================================================

export const message = pgTable("message", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => room.id, { onDelete: "cascade" }),

  // Autor wiadomości
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // null dla bota
  role: messageRole("role").notNull(),

  content: text("content").notNull(),

  // Metadata
  metadata: jsonb("metadata"), // np. token count, model version, czy zawiera deklarację czasu

  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// ============================================================================
// ANALIZA ("Znajdź termin") (US-008, US-009, US-011, US-012)
// ============================================================================

export const analysis = pgTable("analysis", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => room.id, { onDelete: "cascade" }),

  // Kto uruchomił analizę
  triggeredById: text("triggered_by_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Status analizy
  status: analysisStatus("status").default("processing").notNull(),

  // Dane wysłane do AI
  sentMessagesCount: integer("sent_messages_count").notNull(), // ile wiadomości wysłano do AI
  contextData: jsonb("context_data"), // pełny kontekst wysłany do AI (dla debugowania)

  // Odpowiedź z AI
  rawApiResponse: jsonb("raw_api_response"), // pełna odpowiedź z API
  aiModel: text("ai_model"), // np. "claude-sonnet-4"

  // Wyniki
  totalSlotsFound: integer("total_slots_found").default(0), // ile slotów znaleziono
  proposedSlotsCount: integer("proposed_slots_count").default(0), // ile zaproponowano (1-3)

  // Błędy
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0), // dla mechanizmu retry (US-011)

  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  completedAt: timestamp("completed_at"),
});

// ============================================================================
// SPARSOWANE SLOTY DOSTĘPNOŚCI (wynik parsowania AI)
// ============================================================================

export const parsedAvailability = pgTable("parsed_availability", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analysis.id, { onDelete: "cascade" }),

  // Anonimizowany użytkownik (SHA-256 hash)
  anonymizedUserId: text("anonymized_user_id").notNull(),

  // Slot dostępności
  slotStart: timestamp("slot_start").notNull(),
  slotEnd: timestamp("slot_end").notNull(),

  // Metadata
  confidence: text("confidence"), // np. "high", "medium", "low" - jeśli AI to zwraca
  originalMessageIds: jsonb("original_message_ids"), // array ID wiadomości źródłowych

  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// ============================================================================
// ZAPROPONOWANE TERMINY (wynik logiki przecięć backendu)
// ============================================================================

export const timeSlotProposal = pgTable("time_slot_proposal", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analysis.id, { onDelete: "cascade" }),

  // Proponowany slot
  proposedStart: timestamp("proposed_start").notNull(),
  proposedEnd: timestamp("proposed_end").notNull(),

  // Uczestnicy
  matchingParticipantsCount: integer("matching_participants_count").notNull(),
  totalParticipantsCount: integer("total_participants_count").notNull(),
  isPartialMatch: boolean("is_partial_match").default(false).notNull(), // dla US-012

  // Metadata
  matchingUserHashes: jsonb("matching_user_hashes"), // array anonimizowanych ID
  missingUserHashes: jsonb("missing_user_hashes"), // kto nie ma dostępności w tym slocie

  // Ranking (1 = najlepszy)
  rank: integer("rank").default(1).notNull(),

  // Czy został wybrany przez Organizatora
  isSelected: boolean("is_selected").default(false).notNull(),

  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// ============================================================================
// RELACJE
// ============================================================================

export const roomRelations = relations(room, ({ one, many }) => ({
  owner: one(user, {
    fields: [room.ownerId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [room.organizationId],
    references: [organization.id],
  }),
  participants: many(roomParticipant),
  messages: many(message),
  analyses: many(analysis),
  lastAnalysisMessage: one(message, {
    fields: [room.lastAnalysisMessageId],
    references: [message.id],
  }),
}));

export const roomParticipantRelations = relations(
  roomParticipant,
  ({ one }) => ({
    room: one(room, {
      fields: [roomParticipant.roomId],
      references: [room.id],
    }),
    user: one(user, {
      fields: [roomParticipant.userId],
      references: [user.id],
    }),
  })
);

export const messageRelations = relations(message, ({ one }) => ({
  room: one(room, {
    fields: [message.roomId],
    references: [room.id],
  }),
  user: one(user, {
    fields: [message.userId],
    references: [user.id],
  }),
}));

export const analysisRelations = relations(analysis, ({ one, many }) => ({
  room: one(room, {
    fields: [analysis.roomId],
    references: [room.id],
  }),
  triggeredBy: one(user, {
    fields: [analysis.triggeredById],
    references: [user.id],
  }),
  parsedAvailabilities: many(parsedAvailability),
  proposedSlots: many(timeSlotProposal),
}));

export const parsedAvailabilityRelations = relations(
  parsedAvailability,
  ({ one }) => ({
    analysis: one(analysis, {
      fields: [parsedAvailability.analysisId],
      references: [analysis.id],
    }),
  })
);

export const timeSlotProposalRelations = relations(
  timeSlotProposal,
  ({ one }) => ({
    analysis: one(analysis, {
      fields: [timeSlotProposal.analysisId],
      references: [analysis.id],
    }),
  })
);

// ============================================================================
// TYPY
// ============================================================================

export type Room = typeof room.$inferSelect;
export type RoomParticipant = typeof roomParticipant.$inferSelect;
export type Message = typeof message.$inferSelect;
export type Analysis = typeof analysis.$inferSelect;
export type ParsedAvailability = typeof parsedAvailability.$inferSelect;
export type TimeSlotProposal = typeof timeSlotProposal.$inferSelect;

// Typy rozszerzone
export type RoomWithParticipants = Room & {
  participants: (RoomParticipant & { user: User })[];
  owner: User;
};

export type AnalysisWithResults = Analysis & {
  parsedAvailabilities: ParsedAvailability[];
  proposedSlots: TimeSlotProposal[];
};

// ============================================================================
// EXPORT SCHEMA
// ============================================================================

export const schema = {
  // Existing tables
  user,
  session,
  account,
  verification,
  organization,
  member,
  invitation,

  // New tables
  room,
  roomParticipant,
  message,
  analysis,
  parsedAvailability,
  timeSlotProposal,

  // Existing relations
  organizationRelations,
  memberRelations,

  // New relations
  roomRelations,
  roomParticipantRelations,
  messageRelations,
  analysisRelations,
  parsedAvailabilityRelations,
  timeSlotProposalRelations,
};
