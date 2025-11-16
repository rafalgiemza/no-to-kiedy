import { describe, it, expect } from "vitest";
import { intersectAvailability, findPartialMatches, type TimeSlot } from "./intersect";

const slot = (start: string, end: string): TimeSlot => ({ start, end });

const ONE_MIN = 60 * 1000;
const THIRTY_MIN = 30 * ONE_MIN;
const TWO_HOURS = 2 * 60 * ONE_MIN;

describe("intersectAvailability", () => {
  it("returns empty when no schedules", () => {
    expect(intersectAvailability([])).toEqual([]);
  });

  it("finds simple overlap", () => {
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T11:00:00Z")];
    const b = [slot("2025-02-10T10:00:00Z", "2025-02-10T12:00:00Z")];

    const r = intersectAvailability([a, b]);
    expect(r).toEqual([
      { start: "2025-02-10T10:00:00.000Z", end: "2025-02-10T11:00:00.000Z" },
    ]);
  });

  it("filters by minDuration", () => {
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T09:10:00Z")]; // 10m
    const b = [slot("2025-02-10T09:05:00Z", "2025-02-10T09:15:00Z")]; // overlap 5m

    const r = intersectAvailability([a, b], THIRTY_MIN);
    expect(r).toEqual([]);
  });

  it("allows duration above minimum", () => {
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T12:00:00Z")];
    const b = [slot("2025-02-10T10:00:00Z", "2025-02-10T11:00:00Z")]; // 1h

    const r = intersectAvailability([a, b], THIRTY_MIN);
    expect(r).toEqual([
      { start: "2025-02-10T10:00:00.000Z", end: "2025-02-10T11:00:00.000Z" },
    ]);
  });

  it("handles multiple intervals per participant", () => {
    const a = [
      slot("2025-02-10T09:00:00Z", "2025-02-10T10:00:00Z"),
      slot("2025-02-10T11:00:00Z", "2025-02-10T12:00:00Z"),
    ];
    const b = [
      slot("2025-02-10T09:30:00Z", "2025-02-10T10:30:00Z"),
      slot("2025-02-10T11:30:00Z", "2025-02-10T12:30:00Z"),
    ];

    const r = intersectAvailability([a, b]);
    expect(r).toEqual([
      { start: "2025-02-10T09:30:00.000Z", end: "2025-02-10T10:00:00.000Z" },
      { start: "2025-02-10T11:30:00.000Z", end: "2025-02-10T12:00:00.000Z" },
    ]);
  });

  it("returns slots as-is for single participant", () => {
    const a = [
      slot("2025-02-10T09:00:00Z", "2025-02-10T10:00:00Z"),
      slot("2025-02-10T11:00:00Z", "2025-02-10T12:00:00Z"),
    ];

    const r = intersectAvailability([a]);
    expect(r).toEqual([
      { start: "2025-02-10T09:00:00.000Z", end: "2025-02-10T10:00:00.000Z" },
      { start: "2025-02-10T11:00:00.000Z", end: "2025-02-10T12:00:00.000Z" },
    ]);
  });

  it("returns empty when schedules have no overlap", () => {
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T10:00:00Z")];
    const b = [slot("2025-02-10T11:00:00Z", "2025-02-10T12:00:00Z")];

    const r = intersectAvailability([a, b]);
    expect(r).toEqual([]);
  });

  it("handles 3+ participants with partial overlaps", () => {
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T12:00:00Z")];
    const b = [slot("2025-02-10T10:00:00Z", "2025-02-10T13:00:00Z")];
    const c = [slot("2025-02-10T10:30:00Z", "2025-02-10T11:30:00Z")];

    const r = intersectAvailability([a, b, c]);
    expect(r).toEqual([
      { start: "2025-02-10T10:30:00.000Z", end: "2025-02-10T11:30:00.000Z" },
    ]);
  });

  it("handles complete containment (smaller slot inside larger)", () => {
    const a = [slot("2025-02-10T08:00:00Z", "2025-02-10T14:00:00Z")]; // 6h
    const b = [slot("2025-02-10T10:00:00Z", "2025-02-10T11:00:00Z")]; // 1h inside

    const r = intersectAvailability([a, b]);
    expect(r).toEqual([
      { start: "2025-02-10T10:00:00.000Z", end: "2025-02-10T11:00:00.000Z" },
    ]);
  });

  it("returns empty for adjacent (touching) slots", () => {
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T10:00:00Z")];
    const b = [slot("2025-02-10T10:00:00Z", "2025-02-10T11:00:00Z")]; // starts exactly when a ends

    const r = intersectAvailability([a, b]);
    expect(r).toEqual([]); // No overlap, just touching
  });

  it("handles identical time slots", () => {
    const a = [slot("2025-02-10T10:00:00Z", "2025-02-10T11:00:00Z")];
    const b = [slot("2025-02-10T10:00:00Z", "2025-02-10T11:00:00Z")];
    const c = [slot("2025-02-10T10:00:00Z", "2025-02-10T11:00:00Z")];

    const r = intersectAvailability([a, b, c]);
    expect(r).toEqual([
      { start: "2025-02-10T10:00:00.000Z", end: "2025-02-10T11:00:00.000Z" },
    ]);
  });

  it("produces multiple disjoint intersection results", () => {
    const a = [
      slot("2025-02-10T09:00:00Z", "2025-02-10T10:00:00Z"),
      slot("2025-02-10T11:00:00Z", "2025-02-10T12:00:00Z"),
      slot("2025-02-10T14:00:00Z", "2025-02-10T15:00:00Z"),
    ];
    const b = [
      slot("2025-02-10T09:15:00Z", "2025-02-10T09:45:00Z"),
      slot("2025-02-10T11:30:00Z", "2025-02-10T12:30:00Z"),
      slot("2025-02-10T13:45:00Z", "2025-02-10T14:30:00Z"),
    ];

    const r = intersectAvailability([a, b]);
    expect(r).toEqual([
      { start: "2025-02-10T09:15:00.000Z", end: "2025-02-10T09:45:00.000Z" },
      { start: "2025-02-10T11:30:00.000Z", end: "2025-02-10T12:00:00.000Z" },
      { start: "2025-02-10T14:00:00.000Z", end: "2025-02-10T14:30:00.000Z" },
    ]);
  });

  it("returns empty when one participant has empty schedule", () => {
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T10:00:00Z")];
    const b: TimeSlot[] = [];

    const r = intersectAvailability([a, b]);
    expect(r).toEqual([]);
  });

  it("handles real-world example from UI", () => {
    // Person A: 09:00-12:00 and 14:00-17:00
    // Person B: 10:00-11:30 and 15:00-18:00
    // Expected overlaps: 10:00-11:30 and 15:00-17:00
    const a = [
      slot("2025-02-10T09:00:00.000Z", "2025-02-10T12:00:00.000Z"),
      slot("2025-02-10T14:00:00.000Z", "2025-02-10T17:00:00.000Z"),
    ];
    const b = [
      slot("2025-02-10T10:00:00.000Z", "2025-02-10T11:30:00.000Z"),
      slot("2025-02-10T15:00:00.000Z", "2025-02-10T18:00:00.000Z"),
    ];

    const r = intersectAvailability([a, b]);
    expect(r).toEqual([
      { start: "2025-02-10T10:00:00.000Z", end: "2025-02-10T11:30:00.000Z" },
      { start: "2025-02-10T15:00:00.000Z", end: "2025-02-10T17:00:00.000Z" },
    ]);
  });
});

describe("findPartialMatches (US-012)", () => {
  it("returns full match when all participants have overlap", () => {
    // 3 participants, all overlap 10:00-11:00
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T12:00:00Z")];
    const b = [slot("2025-02-10T10:00:00Z", "2025-02-10T13:00:00Z")];
    const c = [slot("2025-02-10T10:00:00Z", "2025-02-10T11:00:00Z")];

    const result = findPartialMatches([a, b, c]);

    expect(result).not.toBeNull();
    expect(result?.isPartialMatch).toBe(false);
    expect(result?.matchingParticipants).toBe(3);
    expect(result?.totalParticipants).toBe(3);
    expect(result?.matchingIndices).toEqual([0, 1, 2]);
    expect(result?.missingIndices).toEqual([]);
    expect(result?.slots).toHaveLength(1);
  });

  it("returns partial match when only majority has overlap (3 of 4)", () => {
    // 4 participants, only 3 overlap
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T11:00:00Z")];
    const b = [slot("2025-02-10T09:00:00Z", "2025-02-10T11:00:00Z")];
    const c = [slot("2025-02-10T09:00:00Z", "2025-02-10T11:00:00Z")];
    const d = [slot("2025-02-10T14:00:00Z", "2025-02-10T16:00:00Z")]; // No overlap

    const result = findPartialMatches([a, b, c, d]);

    expect(result).not.toBeNull();
    expect(result?.isPartialMatch).toBe(true);
    expect(result?.matchingParticipants).toBe(3);
    expect(result?.totalParticipants).toBe(4);
    expect(result?.matchingIndices).toEqual([0, 1, 2]);
    expect(result?.missingIndices).toEqual([3]);
    expect(result?.slots).toHaveLength(1);
  });

  it("returns partial match for 2 of 3 participants (majority)", () => {
    // 3 participants, only 2 overlap (2/3 = majority)
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T11:00:00Z")];
    const b = [slot("2025-02-10T09:30:00Z", "2025-02-10T10:30:00Z")];
    const c = [slot("2025-02-10T14:00:00Z", "2025-02-10T16:00:00Z")]; // No overlap

    const result = findPartialMatches([a, b, c]);

    expect(result).not.toBeNull();
    expect(result?.isPartialMatch).toBe(true);
    expect(result?.matchingParticipants).toBe(2);
    expect(result?.totalParticipants).toBe(3);
    expect(result?.matchingIndices).toEqual([0, 1]);
    expect(result?.missingIndices).toEqual([2]);
  });

  it("returns null when no majority overlap exists", () => {
    // 3 participants, only 1 available (below 2/3 threshold)
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T11:00:00Z")];
    const b = [slot("2025-02-10T12:00:00Z", "2025-02-10T14:00:00Z")];
    const c = [slot("2025-02-10T15:00:00Z", "2025-02-10T17:00:00Z")];

    const result = findPartialMatches([a, b, c]);

    expect(result).toBeNull();
  });

  it("returns null for 2 participants with no overlap (no partial match possible)", () => {
    // For 2 participants, we need both (2/3 rounded up = 2)
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T11:00:00Z")];
    const b = [slot("2025-02-10T12:00:00Z", "2025-02-10T14:00:00Z")];

    const result = findPartialMatches([a, b]);

    expect(result).toBeNull();
  });

  it("respects minimum duration for partial matches", () => {
    // 3 participants, 2 overlap but only for 10 minutes
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T09:10:00Z")];
    const b = [slot("2025-02-10T09:00:00Z", "2025-02-10T09:10:00Z")];
    const c = [slot("2025-02-10T14:00:00Z", "2025-02-10T16:00:00Z")];

    const result = findPartialMatches([a, b, c], THIRTY_MIN);

    expect(result).toBeNull(); // 10 min overlap < 30 min minimum
  });

  it("finds best partial match with sufficient duration", () => {
    // 4 participants, best match is 3 with 1h overlap
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T12:00:00Z")];
    const b = [slot("2025-02-10T10:00:00Z", "2025-02-10T13:00:00Z")];
    const c = [slot("2025-02-10T10:00:00Z", "2025-02-10T11:00:00Z")];
    const d = [slot("2025-02-10T14:00:00Z", "2025-02-10T16:00:00Z")];

    const result = findPartialMatches([a, b, c, d], THIRTY_MIN);

    expect(result).not.toBeNull();
    expect(result?.isPartialMatch).toBe(true);
    expect(result?.matchingParticipants).toBe(3);
    expect(result?.slots[0].start).toBe("2025-02-10T10:00:00.000Z");
    expect(result?.slots[0].end).toBe("2025-02-10T11:00:00.000Z");
  });

  it("returns null for empty schedules", () => {
    const result = findPartialMatches([]);
    expect(result).toBeNull();
  });

  it("returns full match for single participant", () => {
    const a = [slot("2025-02-10T09:00:00Z", "2025-02-10T11:00:00Z")];

    const result = findPartialMatches([a]);

    expect(result).not.toBeNull();
    expect(result?.isPartialMatch).toBe(false); // Single participant = full match
    expect(result?.matchingParticipants).toBe(1);
    expect(result?.totalParticipants).toBe(1);
  });
});
