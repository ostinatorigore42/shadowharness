import { google } from "googleapis";
import type { Auth } from "googleapis";
import type { CalendarEvent } from "./types";
import { getWeekStart } from "./mock-calendar";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/calendar/callback";

const DAY_OFFSET: Record<CalendarEvent["day"], number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

// Day-of-week index (Mon=0) → day name
const OFFSET_TO_DAY: CalendarEvent["day"][] = [
  "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
];

export function isGoogleCalendarConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

export function createOAuthClient(): Auth.OAuth2Client {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl(client: Auth.OAuth2Client): string {
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
    prompt: "consent", // force consent screen so refresh_token is always returned
  });
}

// Fetches the user's events for the coming week from Google Calendar
export async function fetchWeekEvents(
  tokens: Auth.Credentials
): Promise<CalendarEvent[]> {
  const client = createOAuthClient();
  client.setCredentials(tokens);
  const calendar = google.calendar({ version: "v3", auth: client });

  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: weekStart.toISOString(),
    timeMax: weekEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? [])
    .filter((item) => item.start?.dateTime) // skip all-day events
    .map((item) => {
      const start = new Date(item.start!.dateTime!);
      const end = new Date(item.end?.dateTime ?? item.start!.dateTime!);
      // JS getDay(): 0=Sun,1=Mon,...  → normalize to Mon=0
      const dayIndex = (start.getDay() + 6) % 7;

      return {
        id: item.id ?? crypto.randomUUID(),
        title: item.summary ?? "Untitled",
        day: OFFSET_TO_DAY[dayIndex],
        startHour: start.getHours(),
        endHour: end.getHours() || start.getHours() + 1,
        description: item.description ?? undefined,
        type: "meeting" as const,
        source: "existing" as const,
        date: start.toISOString().slice(0, 10),
      } satisfies CalendarEvent;
    });
}

// Exports generated CalendarEvents into the user's Google Calendar for the coming week.
// Returns the IDs of events that were successfully inserted.
export async function exportEvents(
  tokens: Auth.Credentials,
  events: CalendarEvent[]
): Promise<string[]> {
  const client = createOAuthClient();
  client.setCredentials(tokens);
  const calendar = google.calendar({ version: "v3", auth: client });

  const weekStart = getWeekStart();
  const exported: string[] = [];

  for (const event of events) {
    const offset = DAY_OFFSET[event.day];
    const eventDate = new Date(weekStart);
    eventDate.setDate(weekStart.getDate() + offset);

    const start = new Date(eventDate);
    start.setHours(event.startHour, 0, 0, 0);
    const end = new Date(eventDate);
    end.setHours(event.endHour, 0, 0, 0);

    try {
      await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: event.title,
          description: event.description,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
        },
      });
      exported.push(event.id);
    } catch {
      // Skip individual failures — partial export is fine
    }
  }

  return exported;
}
