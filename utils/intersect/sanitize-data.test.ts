import { describe, it, expect } from "vitest";
import {
  sanitizeData,
  DataValidationError,
  type SanitizeDataInput,
} from "./sanitize-data";
import { TimeSlot } from "./intersect";

const slot = (start: string, end: string): TimeSlot => ({ start, end });

describe("sanitizeData", () => {
  describe("valid inputs", () => {
    it("accepts valid data with all parameters", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [slot("2025-02-10T09:00:00.000Z", "2025-02-10T10:00:00.000Z")],
          [slot("2025-02-10T09:30:00.000Z", "2025-02-10T10:30:00.000Z")],
        ],
        minDurationMs: 1000,
      };

      const result = sanitizeData(input);

      expect(result).toEqual({
        allSchedules: [
          [slot("2025-02-10T09:00:00.000Z", "2025-02-10T10:00:00.000Z")],
          [slot("2025-02-10T09:30:00.000Z", "2025-02-10T10:30:00.000Z")],
        ],
        minDurationMs: 1000,
      });
    });

    it("applies default value when duration param omitted", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [slot("2025-02-10T09:00:00.000Z", "2025-02-10T10:00:00.000Z")],
        ],
      };

      const result = sanitizeData(input);

      expect(result.minDurationMs).toBe(0);
    });

    it("sorts slots by start time", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [
            slot("2025-02-10T11:00:00.000Z", "2025-02-10T12:00:00.000Z"),
            slot("2025-02-10T09:00:00.000Z", "2025-02-10T10:00:00.000Z"),
            slot("2025-02-10T14:00:00.000Z", "2025-02-10T15:00:00.000Z"),
          ],
        ],
      };

      const result = sanitizeData(input);

      expect(result.allSchedules[0]).toEqual([
        slot("2025-02-10T09:00:00.000Z", "2025-02-10T10:00:00.000Z"),
        slot("2025-02-10T11:00:00.000Z", "2025-02-10T12:00:00.000Z"),
        slot("2025-02-10T14:00:00.000Z", "2025-02-10T15:00:00.000Z"),
      ]);
    });

    it("accepts empty schedules", () => {
      const input: SanitizeDataInput = {
        allSchedules: [[], []],
      };

      const result = sanitizeData(input);

      expect(result.allSchedules).toEqual([[], []]);
    });

    it("accepts zero duration value", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [slot("2025-02-10T09:00:00.000Z", "2025-02-10T10:00:00.000Z")],
        ],
        minDurationMs: 0,
      };

      const result = sanitizeData(input);

      expect(result.minDurationMs).toBe(0);
    });
  });

  describe("allSchedules validation", () => {
    it("throws when allSchedules is not an array", () => {
      const input: SanitizeDataInput = {
        allSchedules: "not an array",
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
      expect(() => sanitizeData(input)).toThrow(
        "allSchedules must be an array"
      );
    });

    it("throws when a schedule is not an array", () => {
      const input: SanitizeDataInput = {
        allSchedules: ["not an array"],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
      expect(() => sanitizeData(input)).toThrow(
        "Each schedule must be an array"
      );
    });

    it("throws when allSchedules is null", () => {
      const input: SanitizeDataInput = {
        allSchedules: null,
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
    });
  });

  describe("TimeSlot validation", () => {
    it("throws when start is not a valid ISO date", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [{ start: "invalid-date", end: "2025-02-10T10:00:00.000Z" }],
        ],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
      expect(() => sanitizeData(input)).toThrow("Invalid time slot at index 0");
    });

    it("throws when end is not a valid ISO date", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [{ start: "2025-02-10T09:00:00.000Z", end: "not-a-date" }],
        ],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
      expect(() => sanitizeData(input)).toThrow("Invalid time slot at index 0");
    });

    it("throws when start is not a string", () => {
      const input: SanitizeDataInput = {
        allSchedules: [[{ start: 123456789, end: "2025-02-10T10:00:00.000Z" }]],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
    });

    it("throws when start >= end", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [
            slot("2025-02-10T10:00:00.000Z", "2025-02-10T09:00:00.000Z"), // end before start
          ],
        ],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
      expect(() => sanitizeData(input)).toThrow("Invalid time slot at index 0");
    });

    it("throws when start equals end", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [
            slot("2025-02-10T10:00:00.000Z", "2025-02-10T10:00:00.000Z"), // same time
          ],
        ],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
    });

    it("throws when slot is missing start property", () => {
      const input: SanitizeDataInput = {
        allSchedules: [[{ end: "2025-02-10T10:00:00.000Z" }]],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
    });

    it("throws when slot is missing end property", () => {
      const input: SanitizeDataInput = {
        allSchedules: [[{ start: "2025-02-10T09:00:00.000Z" }]],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
    });

    it("throws when slot is null", () => {
      const input: SanitizeDataInput = {
        allSchedules: [[null]],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
    });

    it("includes participant index in error message", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [slot("2025-02-10T09:00:00.000Z", "2025-02-10T10:00:00.000Z")],
          [{ start: "invalid", end: "2025-02-10T10:00:00.000Z" }], // error at participant 1
        ],
      };

      expect(() => sanitizeData(input)).toThrow("participant index 1");
    });
  });

  describe("duration validation", () => {
    it("throws when minDurationMs is negative", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [slot("2025-02-10T09:00:00.000Z", "2025-02-10T10:00:00.000Z")],
        ],
        minDurationMs: -100,
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
      expect(() => sanitizeData(input)).toThrow(
        "minDurationMs must be a non-negative number"
      );
    });

    it("throws when minDurationMs is not a number", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [slot("2025-02-10T09:00:00.000Z", "2025-02-10T10:00:00.000Z")],
        ],
        minDurationMs: "not a number",
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
    });

  });

  describe("ISO date format strictness", () => {
    it("rejects dates without milliseconds", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [{ start: "2025-02-10T09:00:00Z", end: "2025-02-10T10:00:00Z" }],
        ],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
    });

    it("rejects dates in non-ISO format", () => {
      const input: SanitizeDataInput = {
        allSchedules: [
          [
            {
              start: "2025-02-10 09:00:00",
              end: "2025-02-10T10:00:00.000Z",
            },
          ],
        ],
      };

      expect(() => sanitizeData(input)).toThrow(DataValidationError);
    });
  });
});
