import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exportEvents, isGoogleCalendarConfigured } from "@/lib/google-calendar";
import type { CalendarEvent } from "@/lib/types";
import type { Auth } from "googleapis";

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

// POST /api/calendar/export — export generated events to the user's Google Calendar
export async function POST(req: NextRequest) {
  const { events }: { events: CalendarEvent[] } = await req.json();

  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json(
      { error: "Not connected to Google Calendar" },
      { status: 401 }
    );
  }

  const generated = events.filter((e) => e.source === "generated");
  const exportedIds = await exportEvents(tokens, generated);

  return NextResponse.json({
    exportedIds,
    count: exportedIds.length,
    total: generated.length,
  });
}
