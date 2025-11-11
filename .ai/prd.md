## 1. Przegląd Projektu 📅

Projekt **"No to kiedy?"** to aplikacja w wersji **MVP (Minimum Viable Product)**, której głównym celem jest **skuteczne znajdowanie wspólnego terminu** spotkania dla grupy zaproszonych gości.

Aplikacja działa w oparciu o następujący mechanizm:

1.  Użytkownicy wprowadzają deklaracje dostępności w **prostym języku naturalnym**.
2.  Mechanizmy **sztucznej inteligencji (AI)** parsują te deklaracje.
3.  Logika **backendu** znajduje optymalne przecięcie dostępnych terminów.

Cały proces jest inicjowany i finalizowany przez **Organizatora** spotkania.

---

## 2. Problem Użytkownika 🤯

Tradycyjne metody ustalania terminu spotkania z wieloma uczestnikami są **nieefektywne, czasochłonne i podatne na błędy**.

- **Brak wspólnej platformy:** Użytkownicy muszą korzystać z wielu narzędzi (e-mail, komunikatory, arkusze) do zbierania informacji o dostępności.
- **Trudność w analizie:** Organizator musi ręcznie porównywać skomplikowane harmonogramy, co jest obciążające.
- **Brak automatyzacji:** Nie istnieje prosty sposób na automatyczne znalezienie optymalnego czasu spotkania w oparciu o wpisy w języku naturalnym.

**Rozwiązanie MVP:** Dostarczenie prostej platformy czatowej, w której uczestnicy deklarują dostępność, a dedykowany mechanizm **AI/Backend** automatycznie proponuje jeden lub więcej wspólnych terminów.

---

## 3. Wymagania Funkcjonalne 💻

Poniżej przedstawiono kluczowe wymagania funkcjonalne dla MVP.

### 3.1. Uwierzytelnianie i Autoryzacja

- Wszyscy użytkownicy (**Organizatorzy i Uczestnicy**) muszą logować się za pomocą mechanizmu **Magic Links** (Better-Auth).
- System musi przypisywać stały, unikalny **UserId** każdemu uwierzytelnionemu użytkownikowi, który jest niezbędny do weryfikacji roli Organizatora i anonimizacji danych dla AI.
- Tylko uwierzytelnieni użytkownicy mogą tworzyć pokoje i do nich dołączać.

### 3.2. Zarządzanie Pokojem

- Organizator musi mieć możliwość stworzenia nowego pokoju.
- Podczas tworzenia pokoju, Organizator musi zdefiniować **Długość spotkania** (np. 30 min, 1h, 2h) oraz **Ramy czasowe szukania** (data Od/Do i opcjonalnie godzina Od/Do) za pomocą $\text{datepickers}$.
- System musi wygenerować **unikalny link** do zapraszania gości.
- Tylko Organizator ($\text{OwnerId}$) może inicjować akcję **"Znajdź termin"**.

### 3.3. Wprowadzanie Dostępności

- Uczestnicy muszą mieć możliwość deklarowania swojej dostępności w czacie, używając **prostego, języka naturalnego** (np. "Jestem dostępny jutro od 14 do 16").
- Wiadomości bez terminów są **ignorowane** przez mechanizm parsowania.
- Nowa wiadomość z deklaracją dostępności **zastępuje** lub jest traktowana jako uzupełnienie dla poprzednich deklaracji tego samego użytkownika w danym zakresie czasowym. Złożone warunki (np. warunkowe typu "Jeśli będzie padać...") są poza zakresem MVP.
- Kluczowe zasady pokoju (**Długość spotkania, Ramy czasowe**) muszą być stale widoczne (np. jako przypięta wiadomość).

### 3.4. Analiza i Znajdowanie Terminu

- Akcja **"Znajdź termin"** musi być uruchamiana wyłącznie przez **Organizatora**.
- **Anonimizacja Danych:** Przed przekazaniem wiadomości do AI, UserId każdego uczestnika musi zostać anonimizowany za pomocą **stabilnego hasza (SHA-256)** per-czat.
- **Kontekst dla AI:** Backend ($\text{tRPC}$) musi dostarczyć AI:
  - Aktualną datę/czas i **strefę czasową ($\text{Europe/Warsaw}$)**.
  - Zdefiniowane ramy czasowe szukania.
  - Ostatnie **200 wiadomości** od $\text{lastAnalysisMessageId}$ lub początku czatu.
- **Parsowanie AI:** AI ma za zadanie tylko **sparsować** wiadomości i zwrócić ustrukturyzowaną **listę dostępnych slotów** na użytkownika.
- **Logika Przecięć (Backend):** Właściwa logika znajdowania **przecięć** dostępności (wspólnego terminu o zdefiniowanej Długości spotkania) musi być zaimplementowana w **backendzie ($\text{TypeScript/tRPC}$)**.

### 3.5. Interakcja i Zakończenie

- Bot musi odpowiadać jednym z czterech statusów:
  1.  **Sukces:** Znaleziono **1-3** optymalne, pasujące wszystkim terminy (oferuje przyciski do wyboru).
  2.  **Porażka Częściowa:** Brak terminu dla wszystkich, ale znaleziono termin pasujący **większości** (oferuje przycisk z adnotacją o braku pełnej zgodności).
  3.  **Porażka Całkowita:** Brak jakichkolwiek terminów w zdefiniowanych ramach czasowych.
  4.  **Błąd Systemu:** Wystąpił błąd techniczny (oferuje komunikat o błędzie i 3 mechanizmy $\text{retry}$).
- Po wybraniu terminu przez Organizatora:
  - System musi wygenerować **plik $\text{.ics}$** (do dodania do kalendarza).
  - Status pokoju musi zostać zmieniony na **COMPLETED** ($\text{read-only}$ dla wszystkich).
- **Retencja Danych:** Pokoje ze statusem $\text{COMPLETED}$ muszą być automatycznie usuwane po **30 dniach** za pomocą $\text{cron job}$.
- **Użytkownicy Opuszczający Pokój:** Algorytm nie usuwa dostępności użytkowników, którzy opuścili pokój, w celu uproszczenia logiki MVP.

---

## 4. Granice Projektu 🚫

Następujące funkcjonalności **nie wchodzą w zakres MVP**:

- **Integracja Kalendarza:** Bezpośrednia integracja z kalendarzami zewnętrznymi (np. Google Calendar, Outlook). Jest to zbyt duża złożoność dla MVP, wymagająca dodatkowego OAuth i zarządzania tokenami.
- **Złożone Parsowanie:** Analiza złożonych zdań warunkowych, negacji, preferencji lub niejasnych terminów. Skupiamy się na parsowaniu prostych, jasnych deklaracji dostępności.
- **Powiadomienia:** Powiadomienia e-mail, push, czy w aplikacji (oprócz Magic Link). Skupienie jest na podstawowym przepływie wartości.
- **Zarządzanie Uczestnikami:** Usuwanie zadeklarowanej dostępności osób, które opuściły pokój. Uproszczenie logiki przecięć MVP.
- **Edycja Pokoju COMPLETED:** Możliwość ponownego uruchomienia procesu lub edycji terminu w pokoju ze statusem $\text{COMPLETED}$. Status ten jest ostatecznym zamknięciem akcji ($\text{read-only}$).

---

## 5. Historyjki Użytkowników 🧑‍💻

### 5.1. Uwierzytelnianie i Dostęp

- **US-001 Logowanie za pomocą Google social provider:**
  - _Opis:_ Jako nowy lub powracający użytkownik, chcę zalogować się do aplikacji za pomocą mojego konta google, aby uzyskać bezpieczny dostęp do mojego konta i pokoi.
  - _Kryteria Akceptacji:_ Gdy użytkownik poprawnie zaloguje przez google, to zostaje zalogowany i przekierowany do Dashboardu.
- **US-002 Weryfikacja Identyfikatora:**
  - _Opis:_ Jako system, chcę przypisać każdemu zalogowanemu użytkownikowi stabilny $\text{UserId}$, aby móc weryfikować role (Organizator) i anonimizować dane.
  - _Kryteria Akceptacji:_ Po pomyślnym zalogowaniu, system generuje lub odzyskuje stabilny $\text{UserId}$ dla sesji, który jest używany do sprawdzania autoryzacji do akcji (np. "Znajdź termin").

### 5.2. Tworzenie i Zarządzanie Pokojem

- **US-003 Tworzenie Pokoju:**
  - _Opis:_ Jako Organizator, chcę stworzyć nowy pokój, określając długość spotkania i ramy czasowe, aby móc zaprosić gości i ustalić termin.
  - _Kryteria Akceptacji:_ Gdy Organizator jest zalogowany i poprawnie wypełnia pola "Długość spotkania" (np. 1h) i "Ramy czasowe" (Od/Do, $\text{datepickers}$), Pokój zostaje utworzony. Organizator zostaje przekierowany do widoku czatu pokoju, a kluczowe zasady są przypięte.
- **US-004 Zapraszanie Uczestników:**
  - _Opis:_ Jako Organizator, chcę otrzymać unikalny link do pokoju, aby móc łatwo zaprosić gości.
  - _Kryteria Akceptacji:_ Po utworzeniu pokoju, system generuje unikalny i publicznie dostępny (dla zalogowanych) link do pokoju, a Organizator widzi przycisk do skopiowania linku.
- **US-005 Dołączanie do Pokoju:**
  - _Opis:_ Jako Uczestnik, chcę dołączyć do pokoju za pomocą linku, aby móc deklarować swoją dostępność.
  - _Kryteria Akceptacji:_ Gdy zalogowany Uczestnik klika w link zaproszenia i nie jest jeszcze w pokoju, zostaje dodany do listy uczestników i widzi czat.

### 5.3. Deklarowanie Dostępności

- **US-006 Deklaracja Dostępności:**
  - _Opis:_ Jako Uczestnik, chcę wpisać w czacie moją dostępność, używając prostego języka naturalnego, aby system mógł ją przeanalizować.
  - _Kryteria Akceptacji:_ Gdy Uczestnik w aktywnym pokoju wysyła wiadomość np. "Jestem wolny od 10:00 do 12:00 jutro", wiadomość jest widoczna w czacie i brana pod uwagę w kolejnej analizie AI.
- **US-007 Aktualizacja Dostępności:**
  - _Opis:_ Jako Uczestnik, chcę móc skorygować moją dostępność poprzez wysłanie nowej wiadomości, aby system traktował najnowszą deklarację jako obowiązującą.
  - _Kryteria Akceptacji:_ Gdy Uczestnik wysyła nową, jawną wiadomość o dostępności (w ramach ram czasowych), system ignoruje wcześniejsze deklaracje tego Uczestnika (lub traktuje nowe jako modyfikację) w logice przecięcia.

### 5.4. Znajdowanie Terminu i Finalizacja (Główna Ścieżka)

- **US-008 Inicjowanie Wyszukiwania Terminu:**
  - _Opis:_ Jako Organizator, chcę kliknąć "Znajdź termin", aby system rozpoczął proces analizy i zaproponował wspólne sloty.
  - _Kryteria Akceptacji:_ Gdy Organizator klika "Znajdź termin", system wysyła dane do backendu (z włączoną anonimizacją $\text{SHA-256}$ i kontekstem czasowym w $\text{Europe/Warsaw}$). Backend wykonuje logikę przecięć na sparsowanych slotach i zwraca jeden z 4 statusów. **Tylko Organizator może uruchomić tę akcję.**
- **US-009 Wyświetlanie Sukcesu:**
  - _Opis:_ Jako Organizator, chcę zobaczyć propozycję 1-3 terminów, gdy system znajdzie wspólne przecięcie, aby móc wybrać najlepszą opcję.
  - _Kryteria Akceptacji:_ Gdy Backend zwraca status "Sukces", Bot wyświetla wiadomość z 1-3 proponowanymi terminami. Wiadomość zawiera interaktywne przyciski wyboru dla każdego terminu.
- **US-010 Akceptacja i Finalizacja:**
  - _Opis:_ Jako Organizator, chcę kliknąć w jeden z proponowanych terminów, aby ostatecznie ustalić spotkanie, wygenerować plik $\text{.ics}$ i zakończyć pokój.
  - _Kryteria Akceptacji:_ Gdy Organizator klika w przycisk akceptacji terminu i akcja jest pomyślna, System generuje plik $\text{.ics}$ (do pobrania/dodania do kalendarza), a Status pokoju zostaje zmieniony na $\text{COMPLETED}$ ($\text{read-only}$). Pokój jest oznaczony jako Zakończony na Dashboardzie.
- **US-011 Reakcja na Błąd Systemu (Ścieżka Skrajna):**
  - _Opis:_ Jako Użytkownik, chcę zobaczyć jasny komunikat, gdy wystąpi błąd systemowy podczas analizy, oraz możliwość ponowienia akcji.
  - _Kryteria Akceptacji:_ Gdy Backend zwraca status "Błąd Systemu", Bot wyświetla wiadomość. Wiadomość zawiera informację o błędzie i oferuje 3 mechanizmy $\text{retry}$ ("Spróbuj ponownie").
- **US-012 Porażka Częściowa (Ścieżka Alternatywna):**
  - _Opis:_ Jako Organizator, chcę otrzymać informację o terminie pasującym większości, nawet jeśli nie ma idealnego terminu dla wszystkich.
  - _Kryteria Akceptacji:_ Gdy Backend zwraca status "Porażka Częściowa", Bot wyświetla propozycję terminu wraz z adnotacją, że termin pasuje tylko większości. Wiadomość zawiera przycisk akceptacji.

### 5.5. Dashboard i Retencja

- **US-013 Dashboard Użytkownika:**
  - _Opis:_ Jako Użytkownik, chcę zobaczyć listę moich aktywnych i zakończonych pokoi na dashboardzie, aby móc nimi zarządzać.
  - _Kryteria Akceptacji:_ Po zalogowaniu Użytkownik widzi listę pokoi, w których jest Organizatorem lub Uczestnikiem. Pokoje są wyraźnie podzielone na "Aktywne" (nie $\text{COMPLETED}$) i "Zakończone" ($\text{COMPLETED}$).
- **US-014 Automatyczne Usuwanie Danych:**
  - _Opis:_ Jako system, chcę automatycznie usuwać zakończone pokoje po 30 dniach, aby zachować prywatność i optymalizować retencję danych.
  - _Kryteria Akceptacji:_ Gdy status pokoju to $\text{COMPLETED}$ i czas od tego statusu przekracza 30 dni, $\text{Cron job}$ musi usunąć pokój i wszystkie powiązane dane.

---

## 6. Metryki Sukcesu 📈

Głównym kryterium sukcesu (North Star Metric) dla MVP jest wskaźnik konwersji, mierzony jako finalizacja procesu ustalania terminu.

- **Wskaźnik Finalizacji Pokoiku (KPI)**

  - _Cel:_ **75%**
  - _Sposób pomiaru:_ $\frac{\text{Liczba pokoi ze statusem COMPLETED (generacja .ics)}}{\text{Liczba pokoi, dla których akcja "Znajdź termin" została uruchomiona co najmniej raz}}$
  - _Kontekst:_ Kluczowa miara wartości. Wysoka konwersja świadczy o użyteczności i trafności proponowanych terminów.

- **Użyteczność**

  - _Cel:_ Kluczowe zasady widoczne.
  - _Sposób pomiaru:_ Weryfikacja, czy Długość spotkania i Ramy czasowe są stale wyświetlane w czacie (przypięta wiadomość).
  - _Kontekst:_ Zapewnienie, że użytkownicy mają stały kontekst do deklarowania dostępności.

- **Stabilność**

  - _Cel:_ 99% Uptime.
  - _Sposób pomiaru:_ Mierzony współczynnik pomyślnych zapytań do backendu / AI (z wyłączeniem celowo zwróconych błędów logiki).
  - _Kontekst:_ Walidacja $\text{Zod}$ i mechanizm 3 $\text{retry}$ dla błędów AI muszą zapewniać wysoką odporność.

- **Retencja Danych**
  - _Cel:_ 100% zgodności.
  - _Sposób pomiaru:_ Mierzony wskaźnik prawidłowo usuniętych pokoi $\text{COMPLETED}$ (po 30 dniach) przez $\text{cron job}$.
  - _Kontekst:_ Zgodność z decyzją o 30-dniowej retencji danych.
