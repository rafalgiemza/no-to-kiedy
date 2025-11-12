import { TimeSlot } from "./intersect";

export interface SanitizeDataInput {
  allSchedules: unknown;
  minDurationMs?: unknown;
}

export interface SanitizeDataOutput {
  allSchedules: TimeSlot[][];
  minDurationMs: number;
}

export class DataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataValidationError";
  }
}

// Validates that a value is a valid ISO 8601 date string
function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
}

// Validates that a value is a valid TimeSlot
function isValidTimeSlot(value: unknown): value is TimeSlot {
  if (!value || typeof value !== "object") return false;
  const slot = value as Record<string, unknown>;

  if (!isValidDateString(slot.start) || !isValidDateString(slot.end)) {
    return false;
  }

  const start = new Date(slot.start);
  const end = new Date(slot.end);

  // Ensure start is before end
  return start < end;
}

// Sorts and validates a single participant's schedule
function sanitizeSchedule(schedule: unknown): TimeSlot[] {
  if (!Array.isArray(schedule)) {
    throw new DataValidationError("Each schedule must be an array");
  }

  const validSlots: TimeSlot[] = [];

  for (let i = 0; i < schedule.length; i++) {
    const slot = schedule[i];

    if (!isValidTimeSlot(slot)) {
      throw new DataValidationError(
        `Invalid time slot at index ${i}: must have valid 'start' and 'end' ISO dates with start < end`
      );
    }

    validSlots.push({
      start: slot.start,
      end: slot.end,
    });
  }

  // Sort by start time
  validSlots.sort((a, b) => {
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  return validSlots;
}

// Validates and sanitizes duration parameters
function sanitizeDuration(value: unknown, defaultValue: number, paramName: string): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value !== "number" || isNaN(value) || value < 0) {
    throw new DataValidationError(
      `${paramName} must be a non-negative number, got: ${value}`
    );
  }

  return value;
}

/**
 * Sanitizes and validates input data for the intersectAvailability function.
 *
 * Validates:
 * - allSchedules is an array of arrays
 * - Each TimeSlot has valid ISO 8601 date strings
 * - start < end for each slot
 * - minDurationMs is a non-negative number
 *
 * Normalizes:
 * - Sorts time slots within each schedule by start time
 * - Applies default value for duration parameter
 *
 * @throws {DataValidationError} If validation fails
 */
export function sanitizeData(input: SanitizeDataInput): SanitizeDataOutput {
  const { allSchedules, minDurationMs } = input;

  // Validate allSchedules is an array
  if (!Array.isArray(allSchedules)) {
    throw new DataValidationError("allSchedules must be an array");
  }

  // Sanitize each participant's schedule
  const sanitizedSchedules = allSchedules.map((schedule, index) => {
    try {
      return sanitizeSchedule(schedule);
    } catch (error) {
      if (error instanceof DataValidationError) {
        throw new DataValidationError(
          `Invalid schedule at participant index ${index}: ${error.message}`
        );
      }
      throw error;
    }
  });

  // Sanitize duration parameter
  const sanitizedMinDuration = sanitizeDuration(minDurationMs, 0, "minDurationMs");

  return {
    allSchedules: sanitizedSchedules,
    minDurationMs: sanitizedMinDuration,
  };
}
