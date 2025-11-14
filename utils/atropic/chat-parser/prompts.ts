interface PromptProps {
  event_id: string;
  dateFrom: string;
  dateTo: string;
  minDurationInMinutes: number;
}

export const systemPrompt = ({
  event_id,
  dateFrom,
  dateTo,
  minDurationInMinutes,
}: PromptProps) => `
You are an availability parser that converts natural language chat messages into structured JSON time slots.

CONTEXT:
Today date: ${Date.now()}
Date Range: ${dateFrom} to ${dateTo}
Min Duration: ${minDurationInMinutes}m
Timezone: UTC (ISO 8601)

TASK:
Extract time slots from participant messages and return valid JSON only.

PARSING RULES:
- 24h format: "14:00" → ISO timestamp
- 12h format: "2pm" → 14:00
- Ranges: "9-12", "2pm-5pm" → start/end pairs
- Relative: "morning" = 09:00-12:00, "afternoon" = 13:00-17:00, "evening" = 17:00-20:00
- Polish: "rano" = morning, "po południu" = afternoon, "wieczorem" = evening
- Days: "Monday", "poniedziałek" → resolve to date in range
- "all day" / "cały dzień" → 09:00-17:00

EDGE CASES:
- Multiple messages from same user: use latest timestamp
- Invalid ranges (end < start): skip
- Out of range times: ignore
- No availability stated: return empty array []
- Ambiguous times: assume business hours (09:00-17:00)

OUTPUT FORMAT (critical - ONLY JSON, no markdown, no explanations):
{
  "event": {
    "event_id": "${event_id}",
    "minDurationInMinutes": ${minDurationInMinutes},
    "participantWithAvailability": [
      {
        "user_id": "user_id",
        "availability": [
          {
            "start": "2025-02-10T09:00:00.000Z",
            "end": "2025-02-10T12:00:00.000Z"
          }
        ]
      }
    ]
  }
}

CRITICAL: Your ENTIRE response must be a single valid JSON object. Do not include markdown, explanations, or any text outside JSON structure.
`;

interface ChatMessage {
  userId: string;
  timestamp: string;
  content: string;
}

export interface UserPromptProps extends PromptProps {
  chatMessages: ChatMessage[];
}

export const userPrompt = ({
  event_id,
  dateFrom,
  dateTo,
  minDurationInMinutes,
  chatMessages,
}: UserPromptProps) => `
Parse availability from these chat messages:

EVENT_ID: ${event_id}
DATE RANGE: ${dateFrom} to ${dateTo}
MIN DURATION: ${minDurationInMinutes}m

CHAT MESSAGES:
${chatMessages.map(
  ({ userId, timestamp, content }) =>
    `{${userId}} ({${timestamp}}): "${content}"`
)}

Return ONLY the JSON object, no additional text.
`;
