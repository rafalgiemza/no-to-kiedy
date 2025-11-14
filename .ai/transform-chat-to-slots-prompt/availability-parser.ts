// availability-parser.ts
// Example implementation for parsing availability with Claude API

interface TimeSlot {
  start: string; // ISO 8601 UTC
  end: string;   // ISO 8601 UTC
}

interface Participant {
  id: string;
  name: string;
  email: string;
  avatar: string;
  availability: TimeSlot[];
}

interface Event {
  id: string;
  title: string;
  minDuration: number; // milliseconds
  participants: Participant[];
}

interface ChatMessage {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  message: string;
  timestamp: string;
}

interface ParseAvailabilityInput {
  eventId: string;
  eventTitle: string;
  dateFrom: string; // ISO 8601
  dateTo: string;   // ISO 8601
  minDuration: number; // milliseconds
  messages: ChatMessage[];
}

async function parseAvailability(input: ParseAvailabilityInput): Promise<Event> {
  const systemPrompt = `You are an expert availability parser that extracts structured time slots from natural language chat messages. Your task is to analyze user messages and convert their availability statements into precise JSON time intervals.

## Context
Users are coordinating a meeting with:
- **Event ID**: ${input.eventId}
- **Event Title**: ${input.eventTitle}
- **Date Range**: From ${input.dateFrom} to ${input.dateTo}
- **Minimum Duration**: ${input.minDuration} milliseconds
- **Timezone**: All times should be in UTC (ISO 8601 format)

## Parsing Rules
[... full system prompt content from the .md file ...]

## CRITICAL: Output Format
Return ONLY a valid JSON object (no markdown, no explanations) matching this structure:
{
  "event": {
    "id": "${input.eventId}",
    "title": "${input.eventTitle}",
    "minDuration": ${input.minDuration},
    "participants": [...]
  }
}`;

  // Format messages for the user prompt
  const userPrompt = `Parse the following chat messages and extract availability:

## Event Details
- Event ID: ${input.eventId}
- Title: ${input.eventTitle}
- Date Range: ${input.dateFrom} to ${input.dateTo}
- Minimum Duration: ${input.minDuration}ms

## Participants Information
${input.messages.map(msg => `- ${msg.userName} (${msg.email}, ID: ${msg.userId})`).join('\n')}

## Chat Messages
${input.messages.map((msg, idx) => 
  `[${idx + 1}] ${msg.userName} (${msg.timestamp}): "${msg.message}"`
).join('\n\n')}

IMPORTANT: Return ONLY the JSON object, no additional text or markdown.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY || ''
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0, // Deterministic output for parsing
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    // Clean up potential markdown wrappers
    let cleanedResponse = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const result = JSON.parse(cleanedResponse);
    
    // Validate the response structure
    if (!result.event || !result.event.participants) {
      throw new Error('Invalid response structure from AI');
    }

    return result.event;
  } catch (error) {
    console.error('Error parsing availability:', error);
    throw error;
  }
}

// ============================================
// USAGE EXAMPLE
// ============================================

async function example() {
  const input: ParseAvailabilityInput = {
    eventId: 'evt_abc123',
    eventTitle: 'Team Planning Session',
    dateFrom: '2025-02-10T00:00:00.000Z',
    dateTo: '2025-02-12T23:59:59.999Z',
    minDuration: 1800000, // 30 minutes
    messages: [
      {
        userId: 'user_1',
        userName: 'Jan Kowalski',
        userEmail: 'jan@example.com',
        userAvatar: 'https://example.com/jan.jpg',
        message: 'Mogę w poniedziałek od 9 do 12 i we wtorek po południu',
        timestamp: '2025-02-05T10:30:00.000Z'
      },
      {
        userId: 'user_2',
        userName: 'Anna Nowak',
        userEmail: 'anna@example.com',
        userAvatar: 'https://example.com/anna.jpg',
        message: 'I\'m available Monday afternoon and Tuesday morning 9-11am',
        timestamp: '2025-02-05T11:00:00.000Z'
      },
      {
        userId: 'user_3',
        userName: 'Piotr Zając',
        userEmail: 'piotr@example.com',
        userAvatar: 'https://example.com/piotr.jpg',
        message: 'Jestem dostępny w środę cały dzień',
        timestamp: '2025-02-05T14:20:00.000Z'
      }
    ]
  };

  try {
    const result = await parseAvailability(input);
    console.log('Parsed availability:');
    console.log(JSON.stringify(result, null, 2));

    // Find common time slots
    const commonSlots = findCommonAvailability(result);
    console.log('\nCommon available slots:');
    console.log(JSON.stringify(commonSlots, null, 2));
  } catch (error) {
    console.error('Failed to parse availability:', error);
  }
}

// ============================================
// UTILITY: Find overlapping availability
// ============================================

function findCommonAvailability(event: Event): TimeSlot[] {
  if (event.participants.length === 0) return [];
  
  const commonSlots: TimeSlot[] = [];
  const allSlots = event.participants.flatMap(p => p.availability);
  
  // Sort all slots by start time
  allSlots.sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  // Find overlapping periods where all participants are available
  // (This is a simplified version - for production, use a proper interval overlap algorithm)
  
  for (const slot of allSlots) {
    const slotStart = new Date(slot.start).getTime();
    const slotEnd = new Date(slot.end).getTime();
    
    // Check if all participants have availability covering this slot
    const allAvailable = event.participants.every(participant =>
      participant.availability.some(pSlot => {
        const pStart = new Date(pSlot.start).getTime();
        const pEnd = new Date(pSlot.end).getTime();
        return pStart <= slotStart && pEnd >= slotEnd;
      })
    );

    if (allAvailable && (slotEnd - slotStart) >= event.minDuration) {
      commonSlots.push(slot);
    }
  }

  return commonSlots;
}

// Export types and functions
export {
  parseAvailability,
  findCommonAvailability,
  type Event,
  type Participant,
  type TimeSlot,
  type ChatMessage,
  type ParseAvailabilityInput
};
