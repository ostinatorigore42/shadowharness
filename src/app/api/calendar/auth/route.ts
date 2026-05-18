import { NextResponse } from "next/server";
import {
  createOAuthClient,
  getAuthUrl,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";

export async function GET() {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
      },
      { status: 503 }
    );
  }
  const client = createOAuthClient();
  const url = getAuthUrl(client);
  return NextResponse.redirect(url);
}
