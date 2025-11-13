"use client";

import React, { useState } from "react";
import { findCommonAvailability, DataValidationError } from "@/utils/intersect";

const TIMEZONE = "GMT+1"; // Central European Time

export default function IntersectionExample() {
  // Person A schedule
  const [personA1Start, setPersonA1Start] = useState("2025-02-10T09:00");
  const [personA1End, setPersonA1End] = useState("2025-02-10T12:00");
  const [personA2Start, setPersonA2Start] = useState("2025-02-10T14:00");
  const [personA2End, setPersonA2End] = useState("2025-02-10T17:00");

  // Person B schedule
  const [personB1Start, setPersonB1Start] = useState("2025-02-10T10:00");
  const [personB1End, setPersonB1End] = useState("2025-02-10T11:30");
  const [personB2Start, setPersonB2Start] = useState("2025-02-10T15:00");
  const [personB2End, setPersonB2End] = useState("2025-02-10T18:00");

  // Duration constraints (in minutes)
  const [minDuration, setMinDuration] = useState(30);

  // Results
  const [results, setResults] = useState<{ start: string; end: string }[]>([]);
  const [error, setError] = useState<string>("");

  // Convert local datetime-local string to ISO UTC string
  const toUTC = (localDateTime: string): string => {
    return new Date(localDateTime).toISOString();
  };

  const handleFindCommonTimes = () => {
    setError("");
    setResults([]);

    try {
      const result = findCommonAvailability({
        allSchedules: [
          [
            {
              start: toUTC(personA1Start),
              end: toUTC(personA1End),
            },
            {
              start: toUTC(personA2Start),
              end: toUTC(personA2End),
            },
          ],
          [
            {
              start: toUTC(personB1Start),
              end: toUTC(personB1End),
            },
            {
              start: toUTC(personB2Start),
              end: toUTC(personB2End),
            },
          ],
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
          <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-400">
            Person A
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Slot 1 Start
              </label>
              <input
                type="datetime-local"
                value={personA1Start}
                onChange={(e) => setPersonA1Start(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Slot 1 End
              </label>
              <input
                type="datetime-local"
                value={personA1End}
                onChange={(e) => setPersonA1End(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="border-t dark:border-gray-600 pt-3 mt-3">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Slot 2 Start
              </label>
              <input
                type="datetime-local"
                value={personA2Start}
                onChange={(e) => setPersonA2Start(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Slot 2 End
              </label>
              <input
                type="datetime-local"
                value={personA2End}
                onChange={(e) => setPersonA2End(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Person B */}
        <div className="border dark:border-gray-700 rounded-lg p-4 bg-green-50 dark:bg-green-950/30">
          <h2 className="text-xl font-semibold mb-4 text-green-800 dark:text-green-400">
            Person B
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Slot 1 Start
              </label>
              <input
                type="datetime-local"
                value={personB1Start}
                onChange={(e) => setPersonB1Start(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Slot 1 End
              </label>
              <input
                type="datetime-local"
                value={personB1End}
                onChange={(e) => setPersonB1End(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="border-t dark:border-gray-600 pt-3 mt-3">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Slot 2 Start
              </label>
              <input
                type="datetime-local"
                value={personB2Start}
                onChange={(e) => setPersonB2Start(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                Slot 2 End
              </label>
              <input
                type="datetime-local"
                value={personB2End}
                onChange={(e) => setPersonB2End(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
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
