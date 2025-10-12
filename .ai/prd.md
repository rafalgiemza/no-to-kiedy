# PRD v1 — "No to kiedy" (User Stories + Acceptance Criteria Only)

## Context

A web application that helps small groups quickly find mutual meeting times using a chat-based interface.  
Users describe their availability in natural language. AI interprets this input into **structured timestamped availability**, which can later be used by the system to calculate intersections or visualize calendars.

---

## User Stories & Acceptance Criteria (Happy Path Only)

### 1. Authentication & Access

**US-1: User Login via Discord**  
_As a user, I want to log in using my Discord account so that I can access my meetings._

**Acceptance Criteria**

- Given I am not logged in
- When I click "Log in with Discord"
- Then I am redirected to Discord OAuth and returned authenticated

---

### 2. Meeting Creation & Ownership

**US-2: Create a New Meeting**  
_As an authenticated user, I want to create a meeting by providing a name, estimated number of participants, and estimated duration._

**Acceptance Criteria**

- Given I am logged in
- When I submit valid meeting fields
- Then a new meeting is created and I am redirected to its view

---

**US-3: Get an Invitation Link**  
_As a meeting creator, I want to copy an invitation link so others can join._

**Acceptance Criteria**

- Given I am on the meeting page I created
- When I click “Copy Invitation Link”
- Then the link is copied to my clipboard

---

### 3. Invitation & Joining

**US-4: Join via Invitation Link**  
_As an invited user, I want to join a meeting through a shared link._

**Acceptance Criteria**

- Given I am logged out and open a valid invitation link
- When I log in via Discord
- Then I am automatically added to that meeting and redirected to it

---

### 4. Chat-Based Availability Input

**US-5: Submit My Availability (Natural Language)**  
_As a meeting participant, I want to type my availability in plain text so that it can be interpreted by AI._

**Acceptance Criteria**

- Given I am viewing a meeting
- When I send a message like “I can attend next Monday from 08:00 to 10:00”
- Then my message is visible in the shared chat instantly

---

### 5. AI Interpretation of Availability

**US-6: Request AI to Interpret Availability**  
_As the meeting creator, I want to request AI to interpret all submitted availability so that I can later calculate overlaps._

**Acceptance Criteria**

- Given participants have submitted at least one availability message
- When I click “Interpret Availability”
- Then the system sends all messages to Gemini AI
- And AI returns a **structured list of availability** in the format:

```json
[
  { "person": "Anna", "from": "2025-10-15T15:00:00", "to": "2025-10-15T17:00:00" },
  { "person": "Anna", "from": "2025-10-16T15:00:00", "to": "2025-10-16T17:00:00" },
  { "person": "Tomek", "from": "2025-10-17T19:00:00", "to": "2025-10-17T20:00:00" }
]
Each entry represents a concrete timestamp for one person

6. Display Interpreted Availability
US-7: View Interpreted Availability
As a participant, I want to see the structured availability returned by AI so that I can later calculate overlaps or visualize potential meetings.

Acceptance Criteria

Given AI has returned the structured availability

When the response is received

Then the availability is displayed in a readable, ordered format for all participants

7. Data Model for Availability
US-8: Store Availability in Timestamped Format
As the system, I want to store all interpreted availability as { person, timestamp } blocks so that future calculations (intersections, calendars) are straightforward.

Acceptance Criteria

Given AI returns structured availability

When saving to the database

Then each availability entry is stored as:

json
{
  "person": "User Name or ID",
  "from": "ISO 8601 timestamp",
  "to": "ISO 8601 timestamp"
}
No assumptions are made about days of the week or repeating patterns
```
