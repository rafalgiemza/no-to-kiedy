/**
 * Utility for generating direct calendar links
 * Allows users to add events directly to Google Calendar, Outlook, etc.
 */

interface CalendarEventData {
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
}

/**
 * Formats date for Google Calendar URL (YYYYMMDDTHHmmssZ in UTC)
 */
function formatGoogleCalendarDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Formats date for Outlook Calendar URL (ISO 8601)
 */
function formatOutlookDate(date: Date): string {
  return date.toISOString();
}

/**
 * Generates a Google Calendar add event URL
 * @see https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/main/services/google.md
 */
export function generateGoogleCalendarLink(event: CalendarEventData): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleCalendarDate(event.startTime)}/${formatGoogleCalendarDate(event.endTime)}`,
  });

  if (event.description) {
    params.append("details", event.description);
  }

  if (event.location) {
    params.append("location", event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an Outlook Calendar add event URL
 * @see https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/main/services/outlook-live.md
 */
export function generateOutlookCalendarLink(event: CalendarEventData): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: formatOutlookDate(event.startTime),
    enddt: formatOutlookDate(event.endTime),
  });

  if (event.description) {
    params.append("body", event.description);
  }

  if (event.location) {
    params.append("location", event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates an Office 365 Calendar add event URL
 */
export function generateOffice365CalendarLink(
  event: CalendarEventData
): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: formatOutlookDate(event.startTime),
    enddt: formatOutlookDate(event.endTime),
  });

  if (event.description) {
    params.append("body", event.description);
  }

  if (event.location) {
    params.append("location", event.location);
  }

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates all calendar links for an event
 */
export function generateAllCalendarLinks(event: CalendarEventData) {
  return {
    google: generateGoogleCalendarLink(event),
    outlook: generateOutlookCalendarLink(event),
    office365: generateOffice365CalendarLink(event),
  };
}
