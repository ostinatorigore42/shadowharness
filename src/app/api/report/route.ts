import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude";
import type { Goal, CalendarEvent, PlanVariation } from "@/lib/types";

interface ReportPayload {
  goals: Goal[];
  variation: PlanVariation;
  calendarEvents: CalendarEvent[];
}

const REPORT_SYSTEM = `You are the user's Shadow — their smarter, more deliberate self.
You just planned their week. Now write a brief debrief.

Output ONLY valid JSON:
{
  "narrative": string,   // 3-4 sentences: why this plan, what it optimises for, what the user should guard against
  "topBet": string,      // the single goal that got the most time and why it deserved it
  "warning": string      // one honest risk or tradeoff the user should know about
}

Be direct, sharp, and personal. No fluff.`;

export async function POST(req: NextRequest) {
  let body: ReportPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { goals, variation, calendarEvents } = body;

  const generatedEvents = calendarEvents.filter((e) => e.source === "generated");

  const goalsSummary = goals
    .sort((a, b) => a.priority - b.priority)
    .map((g) => `- ${g.text}${g.currentState ? ` (${g.currentState})` : ""}`)
    .join("\n");

  const eventsSummary = generatedEvents
    .map((e) => `- ${e.day} ${e.startHour}:00-${e.endHour}:00: ${e.title} [${e.type}]${e.goalRef ? ` → ${e.goalRef}` : ""}`)
    .join("\n");

  const userMessage = `
Plan chosen: "${variation.name}"
Strategic bet: ${variation.central_bet}
Central trap: ${variation.central_trap}

Goals:
${goalsSummary}

Generated time blocks:
${eventsSummary}

Write the debrief JSON.`.trim();

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: REPORT_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to parse report", raw }, { status: 500 });
  }
}
