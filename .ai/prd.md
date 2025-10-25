# Dokument wymagań produktu (PRD) - No to kiedy? (MVP)

## 1. Przegląd projektu 📅

Projekt "No to kiedy?" to aplikacja MVP (Minimum Viable Product), której głównym celem jest skuteczne **znajdowanie wspólnego terminu** spotkania dla grupy zaproszonych gości. Aplikacja wykorzystuje mechanizmy sztucznej inteligencji do parsowania deklaracji dostępności wprowadzanych przez użytkowników w prostym języku naturalnym, a następnie logikę backendu do znalezienia optymalnego przecięcia terminów. Cały proces jest inicjowany i finalizowany przez organizatora spotkania.

---

## 2. Problem użytkownika 🤯

Tradycyjne metody ustalania terminu spotkania z wieloma uczestnikami są nieefektywne, czasochłonne i często prowadzą do długich, niepotrzebnych wątków komunikacyjnych.

- **Brak wspólnej platformy:** Użytkownicy muszą żonglować różnymi narzędziami (e-mail, komunikatory, arkusze kalkulacyjne) w celu zebrania informacji o dostępności.
- **Trudność w analizie:** Organizator musi ręcznie porównywać różne deklaracje czasowe, co jest podatne na błędy, zwłaszcza w przypadku skomplikowanych harmonogramów.
- **Brak automatyzacji:** Nie ma prostego sposobu na automatyczne znalezienie optymalnego czasu spotkania w oparciu o naturalny język.

**Rozwiązanie MVP:** Dostarczenie prostej w użyciu platformy czatowej, w której użytkownicy wpisują swoją dostępność, a dedykowany mechanizm AI/Backend proponuje jeden lub więcej wspólnych terminów.

---

## 3. Wymagania funkcjonalne 💻

Poniżej przedstawiono kluczowe wymagania funkcjonalne dla MVP:

### 3.1. Uwierzytelnianie i Autoryzacja

- Wszyscy użytkownicy (Organizatorzy i Uczestnicy) muszą logować się za pomocą mechanizmu **Magic Links** (Next-Auth).
- System musi przypisywać stały, unikalny UserId każdemu uwierzytelnionemu użytkownikowi, który jest niezbędny do weryfikacji roli Organizatora i anonimizacji danych dla AI.
- Tylko uwierzytelnieni użytkownicy mogą tworzyć pokoje i do nich dołączać.

### 3.2. Zarządzanie Pokojem

- Organizator musi mieć możliwość stworzenia nowego pokoju.
- Podczas tworzenia pokoju, Organizator musi zdefiniować:
  - **Długość spotkania** (np. 30 min, 1h, 2h).
  - **Ramy czasowe szukania** (data Od/Do i opcjonalnie godzina Od/Do) za pomocą $\text{datepickers}$.
- System musi wygenerować **unikalny link** do zapraszania gości.
- Tylko Organizator (OwnerId) może inicjować akcję "Znajdź termin".

### 3.3. Wprowadzanie Dostępności

- Uczestnicy muszą mieć możliwość deklarowania swojej dostępności w czacie, używając **prostego, języka naturalnego** (np. "Jestem dostępny jutro od 14 do 16").
- Wiadomości bez terminów są **ignorowane** przez mechanizm parsowania.
- Nowa wiadomość z deklaracją dostępności **zastępuje** lub jest traktowana jako uzupełnienie dla poprzednich deklaracji tego samego użytkownika w danym zakresie czasowym. Złożone warunki są poza zakresem MVP (np. "Jeśli będzie padać, to jestem dostępny").
- Kluczowe zasady pokoju (Długość spotkania, Ramy czasowe) muszą być stale widoczne (np. jako przypięta wiadomość).

### 3.4. Analiza i Znajdowanie Terminu

- Akcja "Znajdź termin" musi być uruchamiana wyłącznie przez **Organizatora**.
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
  - Status pokoju musi zostać zmieniony na **COMPLETED** (read-only dla wszystkich).
- **Retencja Danych:** Pokoje ze statusem COMPLETED muszą być automatycznie usuwane po **30 dniach** za pomocą $\text{cron job}$.
- **Użytkownicy Opuszczający Pokój:** Algorytm nie usuwa dostępności użytkowników, którzy opuścili pokój, w celu uproszczenia logiki MVP.

---

## 4. Granice projektu 🚫

Poniżej przedstawiono funkcjonalności, które **nie wchodzą w zakres** MVP.

| Kategoria                | Poza Zakresem MVP                                                                                    | Powód / Kontekst                                                                        |
| :----------------------- | :--------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| Integracja Kalendarza    | Bezpośrednia integracja z kalendarzami zewnętrznymi (np. Google Calendar, Outlook).                  | Zbyt duża złożoność dla MVP. Wymagałoby dodatkowego OAuth i zarządzania tokenami.       |
| Złożone Parsowanie       | Analiza złożonych zdań warunkowych, negacji, preferencji lub niejasnych terminów.                    | Uproszczenie AI i skupienie się na parsowaniu prostych, jasnych deklaracji dostępności. |
| Powiadomienia            | Powiadomienia e-mail, push, czy w aplikacji (oprócz Magic Link).                                     | Skupienie na podstawowym przepływie wartości (znajdowanie terminu).                     |
| Zarządzanie Uczestnikami | Usuwanie zadeklarowanej dostępności osób, które opuściły pokój.                                      | Uproszczenie logiki przecięć MVP.                                                       |
| Edycja Pokoju COMPLETED  | Możliwość ponownego uruchomienia procesu lub edycji terminu w pokoju ze statusem $\text{COMPLETED}$. | Status $\text{COMPLETED}$ jest ostatecznym zamknięciem akcji (read-only).               |

---

## 5. Historyjki użytkowników 🧑‍💻

### 5.1. Uwierzytelnianie i Dostęp

| ID     | Tytuł                          | Opis                                                                                                                                                         | Kryteria Akceptacji                                                                                                                                                                                                                                                           |
| :----- | :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-001 | Logowanie za pomocą Magic Link | Jako nowy lub powracający użytkownik, chcę zalogować się do aplikacji za pomocą mojego adresu e-mail, aby uzyskać bezpieczny dostęp do mojego konta i pokoi. | GIVEN Użytkownik podaje poprawny e-mail WHEN Użytkownik klika "Zaloguj" THEN System wysyła Magic Link, A Użytkownik widzi komunikat o wysłaniu linku. GIVEN Użytkownik klika w Magic Link WHEN Link jest ważny THEN Użytkownik jest zalogowany i przekierowany do Dashboardu. |
| US-002 | Weryfikacja Identyfikatora     | Jako system, chcę przypisać każdemu zalogowanemu użytkownikowi stabilny $\text{UserId}$, aby móc weryfikować role (Organizator) i anonimizować dane.         | GIVEN Użytkownik pomyślnie się loguje THEN System generuje lub odzyskuje stabilny $\text{UserId}$ dla sesji, A $\text{UserId}$ jest używany do sprawdzania autoryzacji do akcji (np. "Znajdź termin").                                                                        |

### 5.2. Tworzenie i Zarządzanie Pokojem

| ID     | Tytuł                   | Opis                                                                                                                              | Kryteria Akceptacji                                                                                                                                                                                                                                                                                      |
| :----- | :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-003 | Tworzenie Pokoju        | Jako Organizator, chcę stworzyć nowy pokój, określając długość spotkania i ramy czasowe, aby móc zaprosić gości i ustalić termin. | GIVEN Organizator jest zalogowany WHEN Organizator klika "Utwórz pokój" i poprawnie wypełnia pola: "Długość spotkania" (np. 1h) i "Ramy czasowe" (Od/Do, $\text{datepickers}$) THEN Pokój zostaje utworzony, A Organizator zostaje przekierowany do widoku czatu pokoju, A Kluczowe zasady są przypięte. |
| US-004 | Zapraszanie Uczestników | Jako Organizator, chcę otrzymać unikalny link do pokoju, aby móc łatwo zaprosić gości.                                            | GIVEN Pokój został utworzony THEN System generuje unikalny i publicznie dostępny (dla zalogowanych) link do pokoju, A Organizator widzi przycisk do skopiowania linku.                                                                                                                                   |
| US-005 | Dołączanie do Pokoju    | Jako Uczestnik, chcę dołączyć do pokoju za pomocą linku, aby móc deklarować swoją dostępność.                                     | GIVEN Uczestnik jest zalogowany i klika w link zaproszenia WHEN Uczestnik nie jest jeszcze w pokoju THEN Uczestnik zostaje dodany do listy uczestników, A Uczestnik widzi czat.                                                                                                                          |

### 5.3. Deklarowanie Dostępności

| ID     | Tytuł                    | Opis                                                                                                                                                | Kryteria Akceptacji                                                                                                                                                                                                                                                |
| :----- | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-006 | Deklaracja Dostępności   | Jako Uczestnik, chcę wpisać w czacie moją dostępność, używając prostego języka naturalnego, aby system mógł ją przeanalizować.                      | GIVEN Uczestnik jest w aktywnym pokoju WHEN Uczestnik wysyła wiadomość np. "Jestem wolny od 10:00 do 12:00 jutro" THEN Wiadomość jest widoczna w czacie, A Wiadomość jest brana pod uwagę w kolejnej analizie AI.                                                  |
| US-007 | Aktualizacja Dostępności | Jako Uczestnik, chcę móc skorygować moją dostępność poprzez wysłanie nowej wiadomości, aby system traktował najnowszą deklarację jako obowiązującą. | GIVEN Uczestnik wcześniej wysłał wiadomość o dostępności WHEN Uczestnik wysyła nową, jawną wiadomość o dostępności (w ramach ram czasowych) THEN System ignoruje wcześniejsze deklaracje tego Uczestnika (lub traktuje nowe jako modyfikację) w logice przecięcia. |

### 5.4. Znajdowanie Terminu i Finalizacja (Główna Ścieżka)

| ID     | Tytuł                                     | Opis                                                                                                                                                  | Kryteria Akceptacji                                                                                                                                                                                                                                                                             |
| :----- | :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-008 | Inicjowanie Wyszukiwania Terminu          | Jako Organizator, chcę kliknąć "Znajdź termin", aby system rozpoczął proces analizy i zaproponował wspólne sloty.                                     | GIVEN Organizator klika "Znajdź termin" WHEN System wysyła dane do backendu (anonimizacja SHA-256 i kontekst czasowy w $\text{Europe/Warsaw}$ włączone) THEN Backend wykonuje logikę przecięć na sparsowanych slotach i zwraca jeden z 4 statusów, A Tylko Organizator może uruchomić tę akcję. |
| US-009 | Wyświetlanie Sukcesu                      | Jako Organizator, chcę zobaczyć propozycję 1-3 terminów, gdy system znajdzie wspólne przecięcie, aby móc wybrać najlepszą opcję.                      | GIVEN Backend zwraca status "Sukces" WHEN Bot wyświetla wiadomość z 1-3 proponowanymi terminami THEN Wiadomość zawiera interaktywne przyciski wyboru dla każdego terminu.                                                                                                                       |
| US-010 | Akceptacja i Finalizacja                  | Jako Organizator, chcę kliknąć w jeden z proponowanych terminów, aby ostatecznie ustalić spotkanie, wygenerować plik $\text{.ics}$ i zakończyć pokój. | GIVEN Organizator klika w przycisk akceptacji terminu WHEN Akcja jest pomyślna THEN System generuje plik $\text{.ics}$ (do pobrania/dodania do kalendarza), A Status pokoju zostaje zmieniony na $\text{COMPLETED}$ (read-only), A Pokój jest oznaczony jako Zakończony na Dashboardzie.        |
| US-011 | Reakcja na Błąd Systemu (Ścieżka Skrajna) | Jako Użytkownik, chcę zobaczyć jasny komunikat, gdy wystąpi błąd systemowy podczas analizy, oraz możliwość ponowienia akcji.                          | GIVEN Backend zwraca status "Błąd Systemu" WHEN Bot wyświetla wiadomość THEN Wiadomość zawiera informację o błędzie, A Bot oferuje 3 mechanizmy $\text{retry}$ ("Spróbuj ponownie").                                                                                                            |
| US-012 | Porażka Częściowa (Ścieżka Alternatywna)  | Jako Organizator, chcę otrzymać informację o terminie pasującym większości, nawet jeśli nie ma idealnego terminu dla wszystkich.                      | GIVEN Backend zwraca status "Porażka Częściowa" WHEN Bot wyświetla propozycję terminu THEN Bot wyświetla adnotację, że termin pasuje tylko większości, A Wiadomość zawiera przycisk akceptacji.                                                                                                 |

### 5.5. Dashboard i Retencja

| ID     | Tytuł                        | Opis                                                                                                                            | Kryteria Akceptacji                                                                                                                                                                                                      |
| :----- | :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-013 | Dashboard Użytkownika        | Jako Użytkownik, chcę zobaczyć listę moich aktywnych i zakończonych pokoi na dashboardzie, aby móc nimi zarządzać.              | GIVEN Użytkownik loguje się THEN Użytkownik widzi listę pokoi, w których jest Organizatorem lub Uczestnikiem, A Pokoje są wyraźnie podzielone na "Aktywne" (nie $\text{COMPLETED}$) i "Zakończone" ($\text{COMPLETED}$). |
| US-014 | Automatyczne Usuwanie Danych | Jako system, chcę automatycznie usuwać zakończone pokoje po 30 dniach, aby zachować prywatność i optymalizować retencję danych. | GIVEN Status pokoju to $\text{COMPLETED}$ WHEN Czas od statusu $\text{COMPLETED}$ przekracza 30 dni THEN $\text{Cron job}$ musi usunąć pokój i wszystkie powiązane dane.                                                 |

---

## 6. Metryki sukcesu 📈

Głównym kryterium sukcesu (North Star Metric) dla MVP jest wskaźnik konwersji, mierzony jako finalizacja procesu ustalania terminu.

| Metryka                                | Cel                      | Sposób pomiaru                                                                                                                                                  | Kontekst                                                                                                                         |
| :------------------------------------- | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **Wskaźnik Finalizacji Pokoiku (KPI)** | **75%**                  | $\frac{\text{Liczba pokoi ze statusem COMPLETED (generacja .ics)}}{\text{Liczba pokoi, dla których akcja "Znajdź termin" została uruchomiona co najmniej raz}}$ | Kluczowa miara wartości dostarczanej przez produkt. Wysoka konwersja świadczy o użyteczności i trafności proponowanych terminów. |
| Użyteczność                            | Kluczowe zasady widoczne | Weryfikacja, czy Długość spotkania i Ramy czasowe są stale wyświetlane w czacie (przypięta wiadomość).                                                          | Zapewnienie, że użytkownicy mają stały kontekst do deklarowania dostępności.                                                     |
| Stabilność                             | 99% Uptime               | Mierzony współczynnik pomyślnych zapytań do backendu / AI (z wyłączeniem celowo zwróconych błędów logiki).                                                      | Walidacja $\text{Zod}$ i mechanizm 3 $\text{retry}$ dla błędów AI muszą zapewniać wysoką odporność.                              |
| Retencja Danych                        | 100% zgodności           | Mierzony wskaźnik prawidłowo usuniętych pokoi $\text{COMPLETED}$ (po 30 dniach) przez $\text{cron job}$.                                                        | Zgodność z decyzją o 30-dniowej retencji danych.                                                                                 |
