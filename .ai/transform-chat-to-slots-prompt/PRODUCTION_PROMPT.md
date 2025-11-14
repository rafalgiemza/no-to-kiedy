# PRODUCTION PROMPT - Ready to use with Claude API

## System Prompt (Template)
Use this as your system prompt in API calls. Replace placeholders with actual values.

```
You are an availability parser that converts natural language chat messages into structured JSON time slots.

CONTEXT:
Event: {event_title} ({event_id})
Date Range: {dateFrom} to {dateTo}
Min Duration: {minDuration}ms
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
    "id": "{event_id}",
    "title": "{event_title}",
    "minDuration": {minDuration},
    "participants": [
      {
        "id": "user_id",
        "name": "User Name",
        "email": "user@example.com",
        "avatar": "https://...",
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
```

## User Prompt (Template)
Construct this for each API call with actual data.

```
Parse availability from these chat messages:

EVENT: {event_title} ({event_id})
DATE RANGE: {dateFrom} to {dateTo}
MIN DURATION: {minDuration}ms

PARTICIPANTS:
- {userName} ({userEmail}, ID: {userId})
[repeat for each unique participant]

CHAT MESSAGES:
[1] {userName} ({timestamp}): "{message}"
[2] {userName} ({timestamp}): "{message}"
[repeat for each message]

Return ONLY the JSON object, no additional text.
```

## Complete Example Call

```typescript
const systemPrompt = `You are an availability parser that converts natural language chat messages into structured JSON time slots.

CONTEXT:
Event: Team Meeting (evt_123)
Date Range: 2025-02-10T00:00:00.000Z to 2025-02-10T23:59:59.999Z
Min Duration: 1800000ms
Timezone: UTC (ISO 8601)

[... rest of rules from template above ...]

CRITICAL: Your ENTIRE response must be a single valid JSON object. Do not include markdown, explanations, or any text outside JSON structure.`;

const userPrompt = `Parse availability from these chat messages:

EVENT: Team Meeting (evt_123)
DATE RANGE: 2025-02-10T00:00:00.000Z to 2025-02-10T23:59:59.999Z
MIN DURATION: 1800000ms

PARTICIPANTS:
- Jan Kowalski (jan@example.com, ID: user_1)
- Anna Nowak (anna@example.com, ID: user_2)

CHAT MESSAGES:
[1] Jan Kowalski (2025-02-08T10:00:00.000Z): "Mogę od 9 do 12"
[2] Anna Nowak (2025-02-08T10:30:00.000Z): "I'm available 10am-4pm"

Return ONLY the JSON object, no additional text.`;

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'x-api-key': process.env.ANTHROPIC_API_KEY
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  })
});

const data = await response.json();
let result = data.content[0].text
  .replace(/```json\s*/g, '')
  .replace(/```\s*/g, '')
  .trim();

const parsed = JSON.parse(result);
console.log(parsed.event);
```

## Quick Integration Steps

1. **Install dependencies**:
```bash
npm install @anthropic-ai/sdk
```

2. **Set environment variable**:
```bash
export ANTHROPIC_API_KEY='your-key-here'
```

3. **Copy prompt templates** (above) into your code

4. **Replace placeholders** with your actual data:
   - `{event_id}` → your event ID
   - `{event_title}` → event name
   - `{dateFrom}` → start date (ISO 8601)
   - `{dateTo}` → end date (ISO 8601)
   - `{minDuration}` → minimum duration in milliseconds
   - Message data in user prompt

5. **Make API call** and parse response

6. **Validate output** before using in your app

## Cost Optimization Tips

1. **Use prompt caching**:
```typescript
system: [
  {
    type: "text",
    text: systemPrompt,
    cache_control: { type: "ephemeral" }
  }
]
```

2. **Batch messages**: Don't parse on every new message, wait for 3-5 messages

3. **Filter messages**: Only send messages containing time indicators

4. **Cache results**: Store parsed availability for N minutes

## Common Issues & Fixes

**Issue**: Response includes markdown
**Fix**: Add more emphasis in prompt: "DO NOT USE MARKDOWN BLOCKS"

**Issue**: Invalid time ranges
**Fix**: Add validation after parsing:
```typescript
availability = availability.filter(slot => 
  new Date(slot.end) > new Date(slot.start)
);
```

**Issue**: Missing Polish recognition
**Fix**: Add more examples to system prompt

**Issue**: High costs
**Fix**: Implement caching, batching, and rate limiting

## Monitoring

Track these metrics:
- API calls per day
- Average tokens per request
- Parse success rate
- Average response time
- Cost per parse

## Support

For issues or questions about this prompt system:
- Check test-examples.md for edge cases
- Review README.md for detailed documentation
- Test with your data before production deployment
