export type TimeSlot = { start: string; end: string };

export type PartialMatchResult = {
  slots: TimeSlot[];
  matchingParticipants: number; // How many participants match
  totalParticipants: number; // Total number of participants
  matchingIndices: number[]; // Which participant indices match
  missingIndices: number[]; // Which participant indices don't match
  isPartialMatch: boolean; // Whether this is a partial match (not all participants)
};

// Given multiple participants' availability lists, returns mutual free times
export function intersectAvailability(
  allSchedules: TimeSlot[][],
  minDurationMs = 0
): TimeSlot[] {
  if (!allSchedules.length) return [];

  // Pointers for each schedule list
  const idx = Array(allSchedules.length).fill(0);
  const result: TimeSlot[] = [];

  while (true) {
    // Gather current slots for each participant
    const current = allSchedules.map((slots, i) => slots[idx[i]]);

    // If any participant has no more slots, stop
    if (current.some((slot) => !slot)) break;

    // Calculate overlap boundaries
    const start = new Date(
      Math.max(...current.map((s) => new Date(s.start).getTime()))
    );
    const end = new Date(
      Math.min(...current.map((s) => new Date(s.end).getTime()))
    );

    if (start < end) {
      const diff = end.getTime() - start.getTime();
      if (diff >= minDurationMs) {
        result.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }

    // Move pointer for participant whose slot ends first
    let earliestIdx = 0;
    for (let i = 1; i < current.length; i++) {
      if (
        new Date(current[i].end).getTime() <
        new Date(current[earliestIdx].end).getTime()
      ) {
        earliestIdx = i;
      }
    }

    idx[earliestIdx]++;
  }

  return result;
}

/**
 * US-012: Find partial matches when no full match exists
 * Tries to find time slots that work for the majority of participants
 *
 * Algorithm:
 * 1. First tries to find slots for ALL participants (full match)
 * 2. If no full match, tries N-1 participants, N-2, etc.
 * 3. Stops when finding slots OR going below "majority" threshold
 *
 * "Majority" is defined as:
 * - At least 2/3 of participants (rounded up)
 * - For 2 participants: requires 2 (no partial match possible)
 * - For 3 participants: requires 2 (2/3)
 * - For 4+ participants: requires at least 2/3 rounded up
 *
 * @param allSchedules Array of availability schedules for each participant
 * @param minDurationMs Minimum duration in milliseconds
 * @returns Best match result (full or partial)
 */
export function findPartialMatches(
  allSchedules: TimeSlot[][],
  minDurationMs = 0
): PartialMatchResult | null {
  const totalParticipants = allSchedules.length;

  if (totalParticipants === 0) {
    return null;
  }

  // Calculate majority threshold (at least 2/3, rounded up)
  const majorityThreshold = Math.ceil((totalParticipants * 2) / 3);

  // Try from full match (N) down to majority
  for (let targetSize = totalParticipants; targetSize >= majorityThreshold; targetSize--) {
    // Generate all combinations of participants of size targetSize
    const combinations = getCombinations(totalParticipants, targetSize);

    // Try each combination
    for (const combo of combinations) {
      // Get schedules for this combination
      const selectedSchedules = combo.map(idx => allSchedules[idx]);

      // Find intersections for this group
      const slots = intersectAvailability(selectedSchedules, minDurationMs);

      if (slots.length > 0) {
        // Found matching slots!
        const missingIndices = Array.from({ length: totalParticipants }, (_, i) => i)
          .filter(i => !combo.includes(i));

        return {
          slots,
          matchingParticipants: targetSize,
          totalParticipants,
          matchingIndices: combo,
          missingIndices,
          isPartialMatch: targetSize < totalParticipants,
        };
      }
    }
  }

  // No matches found even for majority
  return null;
}

/**
 * Generate all combinations of k elements from n
 * For example: getCombinations(4, 2) returns [[0,1], [0,2], [0,3], [1,2], [1,3], [2,3]]
 */
function getCombinations(n: number, k: number): number[][] {
  const result: number[][] = [];

  function backtrack(start: number, current: number[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < n; i++) {
      current.push(i);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}
