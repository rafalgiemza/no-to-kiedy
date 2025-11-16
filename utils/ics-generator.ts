/**
 * Utility for generating .ics (iCalendar) files
 * Used in US-010 for meeting finalization
 */

interface ICSEventData {
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
  organizerEmail?: string;
  organizerName?: string;
  attendees?: Array<{ email: string; name: string }>;
}

/**
 * Generates an .ics file content string
 * @param event - Event data
 * @returns iCalendar format string
 */
export function generateICS(event: ICSEventData): string {
  const formatDate = (date: Date): string => {
    // Format: YYYYMMDDTHHMMSSZ (UTC)
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const now = new Date();
  const uid = `${now.getTime()}@no-to-kiedy.app`;

  // Build attendees list
  let attendeesLines = "";
  if (event.attendees && event.attendees.length > 0) {
    attendeesLines = event.attendees
      .map((attendee) => `ATTENDEE;CN=${attendee.name}:mailto:${attendee.email}`)
      .join("\r\n");
  }

  // Build organizer line
  let organizerLine = "";
  if (event.organizerEmail && event.organizerName) {
    organizerLine = `ORGANIZER;CN=${event.organizerName}:mailto:${event.organizerEmail}`;
  }

  // iCalendar format
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//No to kiedy//Meeting Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(event.endTime)}`,
    `SUMMARY:${event.title || "Meeting"}`,
    event.description ? `DESCRIPTION:${event.description}` : "",
    event.location ? `LOCATION:${event.location}` : "",
    organizerLine,
    attendeesLines,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter((line) => line !== "") // Remove empty lines
    .join("\r\n");

  return icsContent;
}

/**
 * Creates a downloadable .ics file blob
 * @param icsContent - iCalendar format string
 * @returns Blob ready for download
 */
export function createICSBlob(icsContent: string): Blob {
  return new Blob([icsContent], {
    type: "text/calendar;charset=utf-8",
  });
}
