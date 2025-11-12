import { describe, it, expect } from "vitest";
import { findCommonAvailability, DataValidationError } from "./index";

describe("findCommonAvailability - integration test", () => {
  it("handles complete workflow with valid unsorted data", () => {
    const result = findCommonAvailability({
      allSchedules: [
        [
          // Person A - unsorted
          { start: "2025-02-10T14:00:00.000Z", end: "2025-02-10T16:00:00.000Z" },
          { start: "2025-02-10T09:00:00.000Z", end: "2025-02-10T12:00:00.000Z" },
        ],
        [
          // Person B
          { start: "2025-02-10T10:00:00.000Z", end: "2025-02-10T11:00:00.000Z" },
          { start: "2025-02-10T14:30:00.000Z", end: "2025-02-10T17:00:00.000Z" },
        ],
      ],
      minDurationMs: 30 * 60 * 1000, // 30 minutes
    });

    expect(result).toEqual([
      { start: "2025-02-10T10:00:00.000Z", end: "2025-02-10T11:00:00.000Z" }, // 1h overlap
      { start: "2025-02-10T14:30:00.000Z", end: "2025-02-10T16:00:00.000Z" }, // 1.5h overlap
    ]);
  });

  it("throws on invalid input", () => {
    expect(() =>
      findCommonAvailability({
        allSchedules: [
          [{ start: "invalid-date", end: "2025-02-10T10:00:00.000Z" }],
        ],
      })
    ).toThrow(DataValidationError);
  });

  it("handles 3 participants with duration constraint", () => {
    const result = findCommonAvailability({
      allSchedules: [
        [{ start: "2025-02-10T09:00:00.000Z", end: "2025-02-10T17:00:00.000Z" }],
        [{ start: "2025-02-10T10:00:00.000Z", end: "2025-02-10T15:00:00.000Z" }],
        [{ start: "2025-02-10T11:00:00.000Z", end: "2025-02-10T13:00:00.000Z" }],
      ],
      minDurationMs: 1 * 60 * 60 * 1000, // min 1 hour
    });

    expect(result).toEqual([
      { start: "2025-02-10T11:00:00.000Z", end: "2025-02-10T13:00:00.000Z" }, // 2h overlap
    ]);
  });

  it("returns empty when no overlap exists", () => {
    const result = findCommonAvailability({
      allSchedules: [
        [{ start: "2025-02-10T09:00:00.000Z", end: "2025-02-10T10:00:00.000Z" }],
        [{ start: "2025-02-10T11:00:00.000Z", end: "2025-02-10T12:00:00.000Z" }],
      ],
    });

    expect(result).toEqual([]);
  });

  it("filters out overlaps that are too short", () => {
    const result = findCommonAvailability({
      allSchedules: [
        [{ start: "2025-02-10T09:00:00.000Z", end: "2025-02-10T09:10:00.000Z" }],
        [{ start: "2025-02-10T09:05:00.000Z", end: "2025-02-10T09:15:00.000Z" }],
      ],
      minDurationMs: 30 * 60 * 1000, // 30 minutes minimum
    });

    expect(result).toEqual([]); // 5-minute overlap is too short
  });
});
