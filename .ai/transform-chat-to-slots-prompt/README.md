# AI Availability Parser - Complete Guide

System parsowania dostępności użytkowników z naturalnego języka do strukturalnego JSON za pomocą Claude API.

## 📋 Spis treści
1. [Przegląd](#przegląd)
2. [Szybki start](#szybki-start)
3. [Struktura promptu](#struktura-promptu)
4. [Najlepsze praktyki](#najlepsze-praktyki)
5. [Optymalizacja kosztów](#optymalizacja-kosztów)
6. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## 🎯 Przegląd

System przetwarza wiadomości czatu, w których użytkownicy wyrażają swoją dostępność w naturalnym języku (polski/angielski) i konwertuje je na precyzyjne przedziały czasowe w formacie JSON.

### Kluczowe możliwości
- ✅ Przetwarzanie języka polskiego i angielskiego
- ✅ Rozpoznawanie różnych formatów czasowych (24h, 12h, względne)
- ✅ Obsługa wielu dni i zakresów
- ✅ Rozwiązywanie konfliktów (ostatnia wiadomość ma priorytet)
- ✅ Mergowanie nakładających się przedziałów
- ✅ Walidacja zakresu dat wydarzenia

### Wejście
```typescript
{
  eventId: "evt_123",
  eventTitle: "Team Meeting",
  dateFrom: "2025-02-10T00:00:00.000Z",
  dateTo: "2025-02-12T23:59:59.999Z",
  minDuration: 1800000, // 30 minutes in ms
  messages: [
    {
      userId: "user_1",
      userName: "Jan Kowalski",
      userEmail: "jan@example.com",
      userAvatar: "https://example.com/jan.jpg",
      message: "Mogę w poniedziałek 9-12 i we wtorek po południu",
      timestamp: "2025-02-08T10:00:00.000Z"
    }
  ]
}
```

### Wyjście
```json
{
  "event": {
    "id": "evt_123",
    "title": "Team Meeting",
    "minDuration": 1800000,
    "participants": [
      {
        "id": "user_1",
        "name": "Jan Kowalski",
        "email": "jan@example.com",
        "avatar": "https://example.com/jan.jpg",
        "availability": [
          {
            "start": "2025-02-10T09:00:00.000Z",
            "end": "2025-02-10T12:00:00.000Z"
          },
          {
            "start": "2025-02-11T13:00:00.000Z",
            "end": "2025-02-11T17:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

---

## 🚀 Szybki start

### 1. Instalacja zależności
```bash
npm install @anthropic-ai/sdk
# lub
yarn add @anthropic-ai/sdk
```

### 2. Konfiguracja środowiska
```bash
# .env
ANTHROPIC_API_KEY=your_api_key_here
```

### 3. Podstawowe użycie
```typescript
import { parseAvailability } from './availability-parser';

const result = await parseAvailability({
  eventId: 'evt_123',
  eventTitle: 'Team Meeting',
  dateFrom: '2025-02-10T00:00:00.000Z',
  dateTo: '2025-02-10T23:59:59.999Z',
  minDuration: 1800000,
  messages: [
    {
      userId: 'user_1',
      userName: 'Jan',
      userEmail: 'jan@example.com',
      userAvatar: 'https://example.com/jan.jpg',
      message: 'Mogę od 9 do 12',
      timestamp: '2025-02-08T10:00:00.000Z'
    }
  ]
});

console.log(result);
```

---

## 📝 Struktura promptu

### System Prompt (stały)
Zawiera:
- Definicję roli AI (availability parser)
- Szczegółowe reguły parsowania
- Formaty wejścia/wyjścia
- Przykłady dla różnych scenariuszy
- Instrukcje obsługi edge cases

**Lokalizacja**: `availability_parser_prompt.md`

### User Prompt (dynamiczny)
Konstruowany dla każdego zapytania:
- Metadane wydarzenia (dateFrom, dateTo, minDuration)
- Lista uczestników
- Wszystkie wiadomości czatu

---

## 💡 Najlepsze praktyki

### 1. Optymalizacja promptu

#### ✅ DO:
```typescript
// Umieść najważniejsze instrukcje na początku i końcu
const systemPrompt = `
You are an expert availability parser.

[... reguły parsowania ...]

CRITICAL: Return ONLY valid JSON, no markdown, no explanations.
`;
```

#### ❌ DON'T:
```typescript
// Nie zakopuj ważnych instrukcji w środku długiego promptu
const systemPrompt = `
Here's some context...
[... 1000 lines ...]
Oh by the way, return JSON. // ← to się zgubi
`;
```

### 2. Formatowanie wiadomości

#### ✅ DO:
```typescript
// Numeruj wiadomości dla łatwiejszego śledzenia
const userPrompt = `
Chat Messages:
[1] Jan (2025-02-08T10:00:00Z): "Mogę w poniedziałek 9-12"
[2] Anna (2025-02-08T11:00:00Z): "Tuesday afternoon works"
`;
```

#### ❌ DON'T:
```typescript
// Nie mieszaj wiadomości bez struktury
const userPrompt = `
Jan: Mogę w poniedziałek
Anna: Tuesday
Jan: 9-12
`; // ← trudne do sparsowania
```

### 3. Walidacja odpowiedzi

```typescript
async function parseAvailability(input: ParseAvailabilityInput) {
  try {
    const response = await callAnthropicAPI(input);
    
    // 1. Usuń markdown jeśli występuje
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // 2. Parsuj JSON
    const result = JSON.parse(cleaned);
    
    // 3. Waliduj strukturę
    if (!result.event?.participants) {
      throw new Error('Invalid structure');
    }
    
    // 4. Waliduj przedziały czasowe
    for (const participant of result.event.participants) {
      for (const slot of participant.availability) {
        if (new Date(slot.start) >= new Date(slot.end)) {
          console.warn(`Invalid slot for ${participant.name}`);
        }
      }
    }
    
    return result.event;
  } catch (error) {
    console.error('Parsing failed:', error);
    throw error;
  }
}
```

### 4. Obsługa błędów

```typescript
// Graceful degradation
try {
  const result = await parseAvailability(input);
  return result;
} catch (error) {
  // Zwróć pustą dostępność zamiast całkowicie failować
  return {
    event: {
      id: input.eventId,
      title: input.eventTitle,
      minDuration: input.minDuration,
      participants: input.messages.map(msg => ({
        id: msg.userId,
        name: msg.userName,
        email: msg.userEmail,
        avatar: msg.userAvatar,
        availability: [] // ← pusta dostępność
      }))
    }
  };
}
```

---

## 💰 Optymalizacja kosztów

### 1. Parametry modelu

```typescript
{
  model: 'claude-sonnet-4-20250514', // Najlepszy balans cena/jakość
  max_tokens: 4000,                  // Wystarczające dla większości przypadków
  temperature: 0,                    // Deterministyczne wyniki dla parsowania
}
```

**Koszt**: ~$0.003 za zapytanie (przy średniej długości)

### 2. Cachowanie promptu systemowego

```typescript
// Claude 4 wspiera prompt caching
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4000,
  system: [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" } // ← cachowanie
    }
  ],
  messages: [...]
});
```

**Oszczędność**: Do 90% kosztów system promptu przy powtarzających się zapytaniach

### 3. Batching wiadomości

```typescript
// Zamiast parsować przy każdej nowej wiadomości
// Zbieraj wiadomości i parsuj np. co 5 nowych wiadomości
// lub po określonym czasie (debounce)

const debouncedParse = debounce(parseAvailability, 2000); // 2 sekundy
```

### 4. Filtrowanie wiadomości

```typescript
// Przetwarzaj tylko wiadomości zawierające wskaźniki czasowe
const relevantMessages = messages.filter(msg => {
  const timeIndicators = /\d{1,2}[:.]\d{2}|rano|afternoon|morning|po[a-z]*/i;
  return timeIndicators.test(msg.message);
});
```

---

## 🔧 Rozwiązywanie problemów

### Problem 1: AI zwraca tekst zamiast JSON

**Objaw**:
```
Error: Unexpected token 'H', "Here's the..." is not valid JSON
```

**Rozwiązanie**:
```typescript
// Wzmocnij instrukcje w system prompt
CRITICAL REQUIREMENTS:
1. DO NOT include markdown code blocks (```)
2. DO NOT include explanations
3. ONLY output valid JSON
4. Your ENTIRE response must be parseable JSON

// I w user prompt
IMPORTANT: Return ONLY the JSON object, absolutely no additional text.
```

### Problem 2: Nieprawidłowe zakresy czasowe

**Objaw**:
```json
{
  "start": "2025-02-10T17:00:00.000Z",
  "end": "2025-02-10T09:00:00.000Z"  // ← end przed start
}
```

**Rozwiązanie**:
```typescript
// Dodaj walidację w aplikacji
function validateTimeSlot(slot: TimeSlot): boolean {
  const start = new Date(slot.start).getTime();
  const end = new Date(slot.end).getTime();
  return end > start;
}

// Filtruj nieprawidłowe sloty
participant.availability = participant.availability.filter(validateTimeSlot);
```

### Problem 3: Brak rozpoznania języka polskiego

**Objaw**: "Mogę rano" → pusta dostępność

**Rozwiązanie**:
```typescript
// Dodaj do system prompt więcej przykładów polskich:

Polish time expressions:
- "rano" → 09:00-12:00
- "po południu" / "popołudniu" → 13:00-17:00
- "wieczorem" / "wieczór" → 17:00-20:00
- "przed południem" → 09:00-12:00
- "cały dzień" → 09:00-17:00
- "od X" → start time at X
- "do X" → end time at X
- "po X" → after X (until end of business hours)
```

### Problem 4: Konfliktujące wiadomości

**Objaw**: User zmienia zdanie, ale oba sloty w wyniku

**Rozwiązanie**:
```typescript
// Strategia 1: W prompt dodaj
When a user sends multiple messages about their availability,
use ONLY the most recent message (latest timestamp).

// Strategia 2: Grupuj wiadomości per user, sortuj po timestamp
const messagesByUser = groupBy(messages, 'userId');
for (const [userId, userMessages] of Object.entries(messagesByUser)) {
  const sorted = userMessages.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  // Użyj tylko pierwszej (najnowszej)
  relevantMessages.push(sorted[0]);
}
```

### Problem 5: Wysokie koszty API

**Rozwiązanie**:
```typescript
// 1. Implementuj rate limiting
const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'minute'
});

// 2. Użyj cachowania
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 }); // 10 minut

async function parseWithCache(input: ParseAvailabilityInput) {
  const cacheKey = `${input.eventId}-${hashMessages(input.messages)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const result = await parseAvailability(input);
  cache.set(cacheKey, result);
  return result;
}

// 3. Batching: zbierz wiadomości i parsuj raz na X czasu
```

---

## 📊 Metryki wydajności

### Typical Response Times
- Pojedyncze wydarzenie, 2-3 użytkowników: **1-2 sekundy**
- Wydarzenie z 5-10 użytkownikami: **2-4 sekundy**
- Skomplikowane, multi-dzień, 10+ użytkowników: **3-6 sekund**

### Token Usage (średnia)
- System prompt: ~2,000 tokens (cacheable)
- User prompt per request: ~500-1,500 tokens
- Response: ~500-2,000 tokens

### Cost Estimates (Claude Sonnet 4)
- Single parse: **$0.003 - $0.01**
- With prompt caching: **$0.001 - $0.003**
- Per 1000 requests: **$3 - $10** (z cachowaniem)

---

## 🎨 Rozszerzenia i customizacja

### 1. Dodanie własnych time patterns

```typescript
// W system prompt dodaj sekcję:
Custom Time Patterns:
- "lunch time" → 12:00-13:00
- "coffee break" → 15:00-15:15
- "EOD" (end of day) → 17:00
- "first thing" → 09:00
```

### 2. Integracja z kalendarzem

```typescript
import { google } from 'googleapis';

async function enrichWithCalendar(
  result: Event,
  calendarIds: Record<string, string>
) {
  const calendar = google.calendar('v3');
  
  for (const participant of result.participants) {
    const calendarId = calendarIds[participant.email];
    if (!calendarId) continue;
    
    // Pobierz zajęte sloty z kalendarza
    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: result.dateFrom,
        timeMax: result.dateTo,
        items: [{ id: calendarId }]
      }
    });
    
    // Usuń zajęte sloty z availability
    participant.availability = removeConflicts(
      participant.availability,
      data.calendars[calendarId].busy
    );
  }
  
  return result;
}
```

### 3. Intelligent suggestion

```typescript
function suggestBestSlot(event: Event): TimeSlot | null {
  // Znajdź slot gdzie wszyscy są dostępni
  const commonSlots = findCommonAvailability(event);
  
  if (commonSlots.length === 0) return null;
  
  // Sortuj według preferencji (np. rano > popołudnie)
  return commonSlots.sort((a, b) => {
    const aHour = new Date(a.start).getUTCHours();
    const bHour = new Date(b.start).getUTCHours();
    
    // Preferuj 10-12 (najlepsza koncentracja)
    const aScore = Math.abs(aHour - 11);
    const bScore = Math.abs(bHour - 11);
    
    return aScore - bScore;
  })[0];
}
```

---

## 📚 Dodatkowe zasoby

- **System Prompt**: `availability_parser_prompt.md`
- **Implementacja**: `availability-parser.ts`
- **Testy**: `test-examples.md`
- **Dokumentacja API**: https://docs.anthropic.com

---

## 🤝 Contributing

Masz pomysł na ulepszenie? Znalazłeś edge case który nie działa?

1. Dodaj test case do `test-examples.md`
2. Zaktualizuj prompt w `availability_parser_prompt.md`
3. Przetestuj na różnych scenariuszach
4. Udokumentuj zmiany w tym README

---

## 📄 Licencja

MIT License - możesz używać w projektach komercyjnych

---

## ⚠️ Ważne uwagi

1. **Timezone**: Wszystkie czasy w UTC. Jeśli użytkownicy są w różnych timezone, musisz to obsłużyć przed/po parsowaniu.

2. **Prywatność**: Wiadomości czatu są wysyłane do API Anthropic. Upewnij się, że masz zgodę użytkowników.

3. **Rate Limits**: Anthropic API ma limity. Implementuj rate limiting i retry logic.

4. **Koszty**: Monitoruj usage, szczególnie przy dużej liczbie użytkowników.

5. **Fallback**: Zawsze miej plan B jeśli API nie odpowiada (np. manual input).

---

## 📞 Support

Masz pytania? Napotkałeś problem?

- GitHub Issues: [link do repo]
- Email: your-email@example.com
- Discord: [link do serwera]

**Ostatnia aktualizacja**: 2025-02-08
