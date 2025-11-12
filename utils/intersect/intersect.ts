export type TimeSlot = { start: string; end: string };

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
