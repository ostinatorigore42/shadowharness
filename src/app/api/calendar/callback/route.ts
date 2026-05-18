import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createOAuthClient, isGoogleCalendarConfigured } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/setup?gcal=denied", req.url));
  }

  if (!code || !isGoogleCalendarConfigured()) {
    return NextResponse.redirect(new URL("/setup?gcal=error", req.url));
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    const cookieStore = await cookies();
    cookieStore.set("gcal_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.redirect(new URL("/setup?gcal=connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/setup?gcal=error", req.url));
  }
}
