"use client";

import React, { useState } from "react";
import { findCommonAvailability, DataValidationError } from "@/utils/intersect";

const TIMEZONE = "GMT+1"; // Central European Time

type TimeSlot = {
  start: string;
  end: string;
};

export default function Chat1Example() {
  // Person A schedule - dynamic slots
  const [personASlots, setPersonASlots] = useState<TimeSlot[]>([
    { start: "2025-02-10T09:00", end: "2025-02-10T12:00" },
  ]);

  // Person B schedule - dynamic slots
  const [personBSlots, setPersonBSlots] = useState<TimeSlot[]>([
    { start: "2025-02-10T10:00", end: "2025-02-10T11:30" },
  ]);

  // Duration constraints (in minutes)
  const [minDuration, setMinDuration] = useState(30);

  // Results
  const [results, setResults] = useState<{ start: string; end: string }[]>([]);
  const [error, setError] = useState<string>("");

  // Convert local datetime-local string to ISO UTC string
  const toUTC = (localDateTime: string): string => {
    return new Date(localDateTime).toISOString();
  };

  // Add new slot for a person
  const addSlot = (person: "A" | "B") => {
    const defaultSlot = { start: "2025-02-10T09:00", end: "2025-02-10T12:00" };
    if (person === "A") {
      setPersonASlots([...personASlots, defaultSlot]);
    } else {
      setPersonBSlots([...personBSlots, defaultSlot]);
    }
  };

  // Remove slot for a person
  const removeSlot = (person: "A" | "B", index: number) => {
    if (person === "A") {
      setPersonASlots(personASlots.filter((_, i) => i !== index));
    } else {
      setPersonBSlots(personBSlots.filter((_, i) => i !== index));
    }
  };

  // Update slot for a person
  const updateSlot = (
    person: "A" | "B",
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    if (person === "A") {
      const updated = [...personASlots];
      updated[index][field] = value;
      setPersonASlots(updated);
    } else {
      const updated = [...personBSlots];
      updated[index][field] = value;
      setPersonBSlots(updated);
    }
  };

  const handleFindCommonTimes = () => {
    setError("");
    setResults([]);

    try {
      const result = findCommonAvailability({
        allSchedules: [
          personASlots.map((slot) => ({
            start: toUTC(slot.start),
            end: toUTC(slot.end),
          })),
          personBSlots.map((slot) => ({
            start: toUTC(slot.start),
            end: toUTC(slot.end),
          })),
        ],
        minDurationMs: minDuration * 60 * 1000,
      });

      setResults(result);
    } catch (err) {
      if (err instanceof DataValidationError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">
        Schedule Intersection Example
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-2">
        Find common availability between two people. Enter time slots for each
        person and set minimum duration.
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
        Timezone: {TIMEZONE}
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Person A */}
        <div className="border dark:border-gray-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-950/30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-400">
              Person A
            </h2>
            <button
              onClick={() => addSlot("A")}
              className="bg-blue-600 dark:bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
            >
              + Add Slot
            </button>
          </div>

          <div className="space-y-4">
            {personASlots.map((slot, index) => (
              <div
                key={index}
                className={`space-y-3 ${
                  index > 0 ? "border-t dark:border-gray-600 pt-4" : ""
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold dark:text-gray-200">
                    Slot {index + 1}
                  </label>
                  {personASlots.length > 1 && (
                    <button
                      onClick={() => removeSlot("A", index)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={slot.start}
                    onChange={(e) => updateSlot("A", index, "start", e.target.value)}
                    className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    End
                  </label>
                  <input
                    type="datetime-local"
                    value={slot.end}
                    onChange={(e) => updateSlot("A", index, "end", e.target.value)}
                    className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Person B */}
        <div className="border dark:border-gray-700 rounded-lg p-4 bg-green-50 dark:bg-green-950/30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-green-800 dark:text-green-400">
              Person B
            </h2>
            <button
              onClick={() => addSlot("B")}
              className="bg-green-600 dark:bg-green-500 text-white px-3 py-1 rounded hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
            >
              + Add Slot
            </button>
          </div>

          <div className="space-y-4">
            {personBSlots.map((slot, index) => (
              <div
                key={index}
                className={`space-y-3 ${
                  index > 0 ? "border-t dark:border-gray-600 pt-4" : ""
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold dark:text-gray-200">
                    Slot {index + 1}
                  </label>
                  {personBSlots.length > 1 && (
                    <button
                      onClick={() => removeSlot("B", index)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={slot.start}
                    onChange={(e) => updateSlot("B", index, "start", e.target.value)}
                    className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    End
                  </label>
                  <input
                    type="datetime-local"
                    value={slot.end}
                    onChange={(e) => updateSlot("B", index, "end", e.target.value)}
                    className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Duration Constraints */}
      <div className="border dark:border-gray-700 rounded-lg p-4 bg-purple-50 dark:bg-purple-950/30 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-purple-800 dark:text-purple-400">
          Duration Constraint
        </h2>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            Minimum Duration (minutes)
          </label>
          <input
            type="number"
            min="0"
            value={minDuration}
            onChange={(e) => setMinDuration(Number(e.target.value))}
            className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Find Button */}
      <button
        onClick={handleFindCommonTimes}
        className="w-full bg-indigo-600 dark:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors mb-6"
      >
        Find Common Availability
      </button>

      {/* Error Display */}
      {error && (
        <div className="border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-400 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-1">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Results Display */}
      {results.length > 0 && (
        <div className="border dark:border-gray-700 rounded-lg p-4 bg-green-50 dark:bg-green-950/30">
          <h2 className="text-xl font-semibold mb-4 text-green-800 dark:text-green-400">
            Common Available Times ({results.length})
          </h2>
          <div className="space-y-3">
            {results.map((slot, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded p-3"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium dark:text-white">
                      {formatDateTime(slot.start)} → {formatDateTime(slot.end)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Duration: {calculateDuration(slot.start, slot.end)}
                    </div>
                  </div>
                  <div className="text-2xl">✓</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !error && (
        <div className="border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg p-4 text-center">
          No common availability found. Try adjusting the time slots or duration
          constraints.
        </div>
      )}
    </div>
  );
}
