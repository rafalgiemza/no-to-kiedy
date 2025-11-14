# Test Examples & Edge Cases

## Test Case 1: Mixed Languages (Polish + English)
### Input
```json
{
  "eventId": "evt_001",
  "eventTitle": "Team Sync",
  "dateFrom": "2025-02-10T00:00:00.000Z",
  "dateTo": "2025-02-10T23:59:59.999Z",
  "minDuration": 1800000,
  "messages": [
    {
      "userId": "user_1",
      "userName": "Marek",
      "userEmail": "marek@example.com",
      "userAvatar": "https://example.com/marek.jpg",
      "message": "Mogę rano 9-11 i po 15:00",
      "timestamp": "2025-02-08T10:00:00.000Z"
    },
    {
      "userId": "user_2",
      "userName": "Sarah",
      "userEmail": "sarah@example.com",
      "userAvatar": "https://example.com/sarah.jpg",
      "message": "I'm available from 10am to 4pm",
      "timestamp": "2025-02-08T10:15:00.000Z"
    }
  ]
}
```

### Expected Output
```json
{
  "event": {
    "id": "evt_001",
    "title": "Team Sync",
    "minDuration": 1800000,
    "participants": [
      {
        "id": "user_1",
        "name": "Marek",
        "email": "marek@example.com",
        "avatar": "https://example.com/marek.jpg",
        "availability": [
          {
            "start": "2025-02-10T09:00:00.000Z",
            "end": "2025-02-10T11:00:00.000Z"
          },
          {
            "start": "2025-02-10T15:00:00.000Z",
            "end": "2025-02-10T17:00:00.000Z"
          }
        ]
      },
      {
        "id": "user_2",
        "name": "Sarah",
        "email": "sarah@example.com",
        "avatar": "https://example.com/sarah.jpg",
        "availability": [
          {
            "start": "2025-02-10T10:00:00.000Z",
            "end": "2025-02-10T16:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

---

## Test Case 2: Multi-Day Event
### Input
```json
{
  "eventId": "evt_002",
  "eventTitle": "Workshop Week",
  "dateFrom": "2025-02-10T00:00:00.000Z",
  "dateTo": "2025-02-14T23:59:59.999Z",
  "minDuration": 3600000,
  "messages": [
    {
      "userId": "user_1",
      "userName": "Kasia",
      "userEmail": "kasia@example.com",
      "userAvatar": "https://example.com/kasia.jpg",
      "message": "Poniedziałek i wtorek cały dzień, środa tylko rano",
      "timestamp": "2025-02-08T09:00:00.000Z"
    },
    {
      "userId": "user_2",
      "userName": "Tom",
      "userEmail": "tom@example.com",
      "userAvatar": "https://example.com/tom.jpg",
      "message": "I can do Tuesday afternoon, Wednesday all day, and Thursday morning",
      "timestamp": "2025-02-08T09:30:00.000Z"
    }
  ]
}
```

### Expected Output
```json
{
  "event": {
    "id": "evt_002",
    "title": "Workshop Week",
    "minDuration": 3600000,
    "participants": [
      {
        "id": "user_1",
        "name": "Kasia",
        "email": "kasia@example.com",
        "avatar": "https://example.com/kasia.jpg",
        "availability": [
          {
            "start": "2025-02-10T09:00:00.000Z",
            "end": "2025-02-10T17:00:00.000Z"
          },
          {
            "start": "2025-02-11T09:00:00.000Z",
            "end": "2025-02-11T17:00:00.000Z"
          },
          {
            "start": "2025-02-12T09:00:00.000Z",
            "end": "2025-02-12T12:00:00.000Z"
          }
        ]
      },
      {
        "id": "user_2",
        "name": "Tom",
        "email": "tom@example.com",
        "avatar": "https://example.com/tom.jpg",
        "availability": [
          {
            "start": "2025-02-11T13:00:00.000Z",
            "end": "2025-02-11T17:00:00.000Z"
          },
          {
            "start": "2025-02-12T09:00:00.000Z",
            "end": "2025-02-12T17:00:00.000Z"
          },
          {
            "start": "2025-02-13T09:00:00.000Z",
            "end": "2025-02-13T12:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

---

## Test Case 3: Updated Availability (Conflict Resolution)
### Input
```json
{
  "eventId": "evt_003",
  "eventTitle": "Client Meeting",
  "dateFrom": "2025-02-15T00:00:00.000Z",
  "dateTo": "2025-02-15T23:59:59.999Z",
  "minDuration": 1800000,
  "messages": [
    {
      "userId": "user_1",
      "userName": "Jan",
      "userEmail": "jan@example.com",
      "userAvatar": "https://example.com/jan.jpg",
      "message": "Mogę od 9 do 12",
      "timestamp": "2025-02-10T10:00:00.000Z"
    },
    {
      "userId": "user_1",
      "userName": "Jan",
      "userEmail": "jan@example.com",
      "userAvatar": "https://example.com/jan.jpg",
      "message": "Przepraszam, jednak tylko od 10 do 12",
      "timestamp": "2025-02-10T14:00:00.000Z"
    }
  ]
}
```

### Expected Output (Use latest message)
```json
{
  "event": {
    "id": "evt_003",
    "title": "Client Meeting",
    "minDuration": 1800000,
    "participants": [
      {
        "id": "user_1",
        "name": "Jan",
        "email": "jan@example.com",
        "avatar": "https://example.com/jan.jpg",
        "availability": [
          {
            "start": "2025-02-15T10:00:00.000Z",
            "end": "2025-02-15T12:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

---

## Test Case 4: No Availability Mentioned
### Input
```json
{
  "eventId": "evt_004",
  "eventTitle": "Optional Sync",
  "dateFrom": "2025-02-20T00:00:00.000Z",
  "dateTo": "2025-02-20T23:59:59.999Z",
  "minDuration": 1800000,
  "messages": [
    {
      "userId": "user_1",
      "userName": "Alex",
      "userEmail": "alex@example.com",
      "userAvatar": "https://example.com/alex.jpg",
      "message": "Sounds good, thanks for organizing!",
      "timestamp": "2025-02-18T09:00:00.000Z"
    },
    {
      "userId": "user_2",
      "userName": "Maria",
      "userEmail": "maria@example.com",
      "userAvatar": "https://example.com/maria.jpg",
      "message": "I'll try to join if I can",
      "timestamp": "2025-02-18T09:30:00.000Z"
    }
  ]
}
```

### Expected Output
```json
{
  "event": {
    "id": "evt_004",
    "title": "Optional Sync",
    "minDuration": 1800000,
    "participants": [
      {
        "id": "user_1",
        "name": "Alex",
        "email": "alex@example.com",
        "avatar": "https://example.com/alex.jpg",
        "availability": []
      },
      {
        "id": "user_2",
        "name": "Maria",
        "email": "maria@example.com",
        "avatar": "https://example.com/maria.jpg",
        "availability": []
      }
    ]
  }
}
```

---

## Test Case 5: Complex Natural Language
### Input
```json
{
  "eventId": "evt_005",
  "eventTitle": "Project Review",
  "dateFrom": "2025-03-01T00:00:00.000Z",
  "dateTo": "2025-03-03T23:59:59.999Z",
  "minDuration": 7200000,
  "messages": [
    {
      "userId": "user_1",
      "userName": "Piotr",
      "userEmail": "piotr@example.com",
      "userAvatar": "https://example.com/piotr.jpg",
      "message": "W sobotę jestem zajęty do 14, potem mogę. Niedziela w ogóle nie pasuje, a w poniedziałek po 16",
      "timestamp": "2025-02-25T10:00:00.000Z"
    },
    {
      "userId": "user_2",
      "userName": "Emma",
      "userEmail": "emma@example.com",
      "userAvatar": "https://example.com/emma.jpg",
      "message": "Saturday anytime after lunch works for me. Sunday I'm completely free. Monday I have meetings until 3pm",
      "timestamp": "2025-02-25T11:00:00.000Z"
    }
  ]
}
```

### Expected Output
```json
{
  "event": {
    "id": "evt_005",
    "title": "Project Review",
    "minDuration": 7200000,
    "participants": [
      {
        "id": "user_1",
        "name": "Piotr",
        "email": "piotr@example.com",
        "avatar": "https://example.com/piotr.jpg",
        "availability": [
          {
            "start": "2025-03-01T14:00:00.000Z",
            "end": "2025-03-01T17:00:00.000Z"
          },
          {
            "start": "2025-03-03T16:00:00.000Z",
            "end": "2025-03-03T17:00:00.000Z"
          }
        ]
      },
      {
        "id": "user_2",
        "name": "Emma",
        "email": "emma@example.com",
        "avatar": "https://example.com/emma.jpg",
        "availability": [
          {
            "start": "2025-03-01T13:00:00.000Z",
            "end": "2025-03-01T17:00:00.000Z"
          },
          {
            "start": "2025-03-02T09:00:00.000Z",
            "end": "2025-03-02T17:00:00.000Z"
          },
          {
            "start": "2025-03-03T15:00:00.000Z",
            "end": "2025-03-03T17:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

---

## Edge Cases to Handle

### 1. Timezone Mentions
**Input**: "I'm available 9am EST"
**Expected**: Convert EST to UTC before creating timestamp

### 2. Overlapping Slots from Same User
**Input**: User says "9-12" then later "10-14"
**Expected**: Merge into single slot 9-14 OR use latest message (10-14)

### 3. Past Dates
**Input**: User mentions date before dateFrom
**Expected**: Ignore that availability

### 4. Ambiguous Day References
**Input**: "next Monday" when multiple Mondays in range
**Expected**: Choose the first Monday in the range

### 5. Partial Information
**Input**: "I'm free in the morning"
**Expected**: Assume 09:00-12:00 for the first day in range

### 6. Negative Availability
**Input**: "I'm busy from 2-4pm but free otherwise"
**Expected**: Return slots around the busy time if context allows

### 7. Multiple Messages Per User
**Expected**: Accumulate or override based on timestamp (use latest)

### 8. Empty Chat
**Expected**: Return participants with empty availability arrays

### 9. Invalid Time Ranges
**Input**: "5pm-3pm" (end before start)
**Expected**: Skip invalid slot, continue parsing

### 10. Very Short Slots
**Input**: "I have 15 minutes at 2pm" when minDuration is 30 min
**Expected**: Still include in availability (let application filter)

---

## Performance Considerations

- **Token Optimization**: For long chat histories, consider:
  - Summarizing older messages
  - Only including last N messages per user
  - Filtering out messages without time indicators

- **Caching**: Consider caching parsed results and only re-parsing when new messages arrive

- **Rate Limiting**: Implement exponential backoff for API calls

- **Validation**: Always validate JSON structure before using in application

---

## Common Prompt Adjustments

### For Better Polish Support
Add to system prompt:
```
Polish time expressions:
- "rano" = morning (9-12)
- "po południu" = afternoon (13-17)
- "wieczorem" = evening (17-20)
- "cały dzień" = all day (9-17)
- "przed południem" = before noon (9-12)
```

### For Stricter Parsing
Add to system prompt:
```
STRICT MODE: 
- Ignore any message without explicit time indicators
- Do not make assumptions about "morning", "afternoon" etc unless no other context
- Require both start and end times explicitly mentioned
```

### For Lenient Parsing
Add to system prompt:
```
LENIENT MODE:
- Infer availability from context clues
- "Sounds good" after time suggestion = agreement to that time
- If only one time slot discussed and user says "yes" = available that slot
```
