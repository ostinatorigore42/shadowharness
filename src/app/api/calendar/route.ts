import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { getMockCalendarEvents, MOCK_CALENDAR_EVENTS } from "@/lib/mock-calendar";
import {
  fetchWeekEvents,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";
import type { CalendarEvent } from "@/lib/types";
import type { Auth } from "googleapis";

const DATA_DIR = path.join(process.cwd(), "data");
const CALENDAR_FILE = path.join(DATA_DIR, "calendar.json");

async function readStoredEvents(): Promise<CalendarEvent[]> {
  try {
    const raw = await fs.readFile(CALENDAR_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [...MOCK_CALENDAR_EVENTS];
  }
}

async function writeStoredEvents(events: CalendarEvent[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CALENDAR_FILE, JSON.stringify(events, null, 2), "utf-8");
  } catch {
    // Vercel and other read-only filesystems — client store handles persistence
  }
}

async function getTokens(): Promise<Auth.Credentials | null> {
  if (!isGoogleCalendarConfigured()) return null;
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("gcal_tokens")?.value;
    if (!raw) return null;
    return JSON.parse(raw) as Auth.Credentials;
  } catch {
    return null;
  }
}

async function getExistingEvents(
  tokens: Auth.Credentials | null
): Promise<{ events: CalendarEvent[]; connected: boolean }> {
  if (tokens) {
    try {
      const events = await fetchWeekEvents(tokens);
      return { events, connected: true };
    } catch {
      // Token expired or GCal unreachable — fall back to date-aware mock
    }
  }
  return { events: getMockCalendarEvents(), connected: false };
}

export async function GET() {
  const tokens = await getTokens();
  const { events: existingEvents, connected } = await getExistingEvents(tokens);

  // Pull only generated events from the persisted store
  const stored = await readStoredEvents();
  const generatedEvents = stored.filter((e) => e.source === "generated");

  return NextResponse.json({
    events: [...existingEvents, ...generatedEvents],
    connected,
  });
}

export async function POST(req: NextRequest) {
  let body: { events: CalendarEvent[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.events)) {
    return NextResponse.json({ error: "events must be an array" }, { status: 400 });
  }

  const generatedEvents = body.events.map((e) => ({
    ...e,
    source: "generated" as const,
  }));

  // Persist: store mock base + generated (so generated survive server restart)
  await writeStoredEvents([...MOCK_CALENDAR_EVENTS, ...generatedEvents]);

  const tokens = await getTokens();
  const { events: existingEvents, connected } = await getExistingEvents(tokens);

  return NextResponse.json({
    events: [...existingEvents, ...generatedEvents],
    added: generatedEvents.length,
    connected,
  });
}

export async function DELETE() {
  await writeStoredEvents([...MOCK_CALENDAR_EVENTS]);

  const tokens = await getTokens();
  const { events: existingEvents, connected } = await getExistingEvents(tokens);

  return NextResponse.json({ events: existingEvents, connected });
}
