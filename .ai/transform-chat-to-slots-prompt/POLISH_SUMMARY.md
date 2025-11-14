# 🎯 Podsumowanie dla Ciebie

## Co dostałeś?

Kompletny system do parsowania dostępności użytkowników z czatu za pomocą Claude API.

### 📁 Struktura plików

1. **`availability_parser_prompt.md`** 
   - Pełny, szczegółowy prompt systemowy
   - Wszystkie reguły parsowania
   - Przykłady i edge cases
   - ~2000 tokenów (dobry do cachowania)

2. **`PRODUCTION_PROMPT.md`** ⭐ **START TUTAJ**
   - Skrócona, gotowa do użycia wersja
   - Szablony do skopiowania
   - Przykład kompletnego wywołania API
   - Quick start guide

3. **`availability-parser.ts`**
   - Kompletna implementacja TypeScript
   - Gotowa funkcja `parseAvailability()`
   - Obsługa błędów
   - Helper do znajdowania wspólnych slotów

4. **`test-examples.md`**
   - 5 szczegółowych test cases
   - 10 edge cases
   - Przykłady PL i EN
   - Oczekiwane outputy

5. **`README.md`**
   - Kompletna dokumentacja
   - Best practices
   - Optymalizacja kosztów
   - Troubleshooting

## 🚀 Jak zacząć (3 kroki)

### Krok 1: Zainstaluj zależności
```bash
npm install @anthropic-ai/sdk
```

### Krok 2: Dodaj API key
```bash
# .env
ANTHROPIC_API_KEY=your_key_here
```

### Krok 3: Użyj gotowego kodu
```typescript
import { parseAvailability } from './availability-parser';

const result = await parseAvailability({
  eventId: 'evt_123',
  eventTitle: 'Spotkanie',
  dateFrom: '2025-02-10T00:00:00.000Z',
  dateTo: '2025-02-10T23:59:59.999Z',
  minDuration: 1800000, // 30 minut
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
// {
//   event: {
//     id: 'evt_123',
//     title: 'Spotkanie',
//     participants: [...],
//     ...
//   }
// }
```

## 💡 Kluczowe informacje

### Co potrafi system?
✅ Rozpoznaje polski i angielski  
✅ Parsuje różne formaty: "9-12", "2pm", "rano", "afternoon"  
✅ Obsługuje wiele dni: "poniedziałek i wtorek"  
✅ Rozwiązuje konflikty (bierze ostatnią wiadomość)  
✅ Merguje nakładające się sloty  
✅ Waliduje daty wydarzenia  

### Ile to kosztuje?
- **Jedno parsowanie**: ~$0.003-0.01
- **Z cachowaniem**: ~$0.001-0.003
- **1000 zapytań**: ~$3-10 (z cachowaniem)

### Jak optymalizować koszty?

1. **Prompt caching** - cachuj system prompt (oszczędność 90%)
2. **Batching** - zbieraj wiadomości i parsuj co X czasu
3. **Filtrowanie** - wysyłaj tylko wiadomości ze wskaźnikami czasu
4. **Local cache** - cachuj wyniki na 5-10 minut

## 🎨 Przykładowe wiadomości które działają

### Polski
```
"Mogę w poniedziałek od 9 do 12"
"Jestem dostępny rano"
"Po południu mi pasuje"
"Wtorek cały dzień"
"Od 15:00 mogę"
"Środa nie pasuje, ale czwartek po 14"
```

### English
```
"I'm available Monday 9-12"
"Tuesday afternoon works for me"
"I can do 2pm-5pm"
"All day Wednesday"
"Morning is better for me"
"After 3pm any day"
```

## 🔧 Częste problemy

### Problem: AI zwraca tekst zamiast JSON
**Rozwiązanie**: W pliku `PRODUCTION_PROMPT.md` są wzmocnione instrukcje - użyj ich

### Problem: Błędne zakresy czasowe  
**Rozwiązanie**: Dodaj walidację po parsowaniu (przykład w `availability-parser.ts`)

### Problem: Nie rozpoznaje polskiego
**Rozwiązanie**: W `availability_parser_prompt.md` są rozszerzone definicje - dodaj więcej przykładów

### Problem: Wysokie koszty
**Rozwiązanie**: Zobacz sekcję "Optymalizacja kosztów" w `README.md`

## 📊 Struktura danych

### Input
```typescript
{
  eventId: string,
  eventTitle: string,
  dateFrom: string,      // ISO 8601 UTC
  dateTo: string,        // ISO 8601 UTC
  minDuration: number,   // milliseconds
  messages: Array<{
    userId: string,
    userName: string,
    userEmail: string,
    userAvatar: string,
    message: string,
    timestamp: string    // ISO 8601
  }>
}
```

### Output
```typescript
{
  event: {
    id: string,
    title: string,
    minDuration: number,
    participants: Array<{
      id: string,
      name: string,
      email: string,
      avatar: string,
      availability: Array<{
        start: string,   // ISO 8601 UTC
        end: string      // ISO 8601 UTC
      }>
    }>
  }
}
```

## 🎯 Next Steps

### Jeśli chcesz od razu zacząć:
1. Otwórz `PRODUCTION_PROMPT.md`
2. Skopiuj szablony promptów
3. Wstaw swoje dane
4. Wywołaj API

### Jeśli chcesz dokładnie zrozumieć:
1. Przeczytaj `README.md` (pełna dokumentacja)
2. Zobacz `test-examples.md` (przykłady użycia)
3. Zbadaj `availability-parser.ts` (implementacja)

### Jeśli chcesz customizować:
1. Modyfikuj `availability_parser_prompt.md`
2. Dodaj własne time patterns
3. Rozszerz o integrację z kalendarzem
4. Dodaj testy w `test-examples.md`

## 💬 Przykład użycia w pełnej aplikacji

```typescript
// 1. User pisze wiadomość w czacie
const newMessage = {
  userId: 'user_1',
  userName: 'Jan',
  userEmail: 'jan@example.com',
  userAvatar: 'https://...',
  message: 'Mogę jutro od 10 do 12',
  timestamp: new Date().toISOString()
};

// 2. Dodaj do historii
chatHistory.push(newMessage);

// 3. Debounce - poczekaj na więcej wiadomości
clearTimeout(parseTimer);
parseTimer = setTimeout(async () => {
  
  // 4. Parsuj dostępność
  const availability = await parseAvailability({
    eventId: event.id,
    eventTitle: event.title,
    dateFrom: event.dateFrom,
    dateTo: event.dateTo,
    minDuration: event.minDuration,
    messages: chatHistory
  });
  
  // 5. Znajdź wspólne sloty
  const commonSlots = findCommonAvailability(availability);
  
  // 6. Zaktualizuj UI
  updateCalendarView(availability);
  if (commonSlots.length > 0) {
    showSuggestion(commonSlots[0]); // Pokaż najlepszy slot
  }
  
}, 2000); // 2 sekundy debounce
```

## 🔐 Ważne uwagi bezpieczeństwa

⚠️ **Dane w chmurze**: Wiadomości są wysyłane do Anthropic API  
⚠️ **RODO**: Upewnij się, że masz zgodę użytkowników  
⚠️ **API Key**: Nigdy nie commituj API key do repo  
⚠️ **Rate limiting**: Implementuj limity żeby nie przekroczyć quota  

## 📚 Dodatkowe zasoby

- [Anthropic API Docs](https://docs.anthropic.com)
- [Claude Prompt Engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## ✅ Checklist przed wdrożeniem

- [ ] Przetestowane z prawdziwymi danymi
- [ ] Dodana obsługa błędów
- [ ] Implementowany rate limiting
- [ ] Skonfigurowany monitoring kosztów
- [ ] Dodane logi dla debugowania
- [ ] Walidacja outputu przed użyciem
- [ ] Fallback jeśli API nie działa
- [ ] Zabezpieczony API key
- [ ] Zgoda użytkowników na przetwarzanie

## 🎉 Gotowe do użycia!

Wszystkie pliki są w `/mnt/user-data/outputs/`.

**Quick start**: Zacznij od `PRODUCTION_PROMPT.md` - masz tam gotowy kod do skopiowania.

Powodzenia! 🚀
