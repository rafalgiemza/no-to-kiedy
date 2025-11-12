import { intersectAvailability } from "./intersect";
import { sanitizeData, SanitizeDataInput } from "./sanitize-data";

// Main export file for the intersect utility
export { intersectAvailability, type TimeSlot } from "./intersect";
export {
  sanitizeData,
  DataValidationError,
  type SanitizeDataInput,
  type SanitizeDataOutput,
} from "./sanitize-data";

/**
 * Convenience function that combines sanitization and intersection.
 * Use this for a safe, validated workflow.
 */
export function findCommonAvailability(input: SanitizeDataInput) {
  const sanitized = sanitizeData(input);
  return intersectAvailability(
    sanitized.allSchedules,
    sanitized.minDurationMs
  );
}
