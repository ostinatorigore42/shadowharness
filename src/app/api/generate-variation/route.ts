import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude";
import type { Goal, Question, QuizAnswer, CalendarEvent } from "@/lib/types";

interface GenerateVariationPayload {
  slot: 0 | 1;
  goals: Goal[];
  documentsContext: string;
  existingEvents: CalendarEvent[];
  questions: Question[];
  answers: QuizAnswer[];
}

const SLOT_INSTRUCTIONS = [
  `Generate exactly ONE plan variation — variation A.
Make the bet that most directly serves the user's top-ranked goal this week, even if it requires hard tradeoffs on lower-ranked goals. Lean in. Be specific about what gets sacrificed and why it's worth it.`,
  `Generate exactly ONE plan variation — variation B.
Make a clearly different strategic bet from what variation A would choose. Perhaps protect something A sacrifices (sustainability, health, a key relationship, a secondary goal). Perhaps take a different angle on the same priority. The two variations should feel like genuinely different choices, not the same plan with different time blocks.`,
];

const VARIATION_SYSTEM = `You are the version of the user operating at their best — the 10x version making real choices about a real week. Not a motivational character. Not a life coach. A sharp, honest friend who knows their situation.

Tone: direct and plain. No hustle-culture language. No words like "leverage", "unlock", "supercharge". Sound like a real person, not a SaaS landing page.

Output ONLY valid JSON matching this schema exactly — a single Variation object (not wrapped in an array):
{
  "id": string,
  "name": string,
  "central_bet": string,
  "central_trap": string,
  "kill_list": KillItem[],
  "drafted_artifacts": Artifact[],
  "failure_modes": FailureMode[],
  "events": CalendarEvent[]
}
where KillItem = { "item": string, "reason": string }
and Artifact = { "recipient": string, "type": "email"|"slack"|"decline", "text": string }
and FailureMode = { "what": string, "early_warning": string, "preventative_response": string }
and CalendarEvent = { "id": string, "title": string, "day": "Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun", "startHour": number, "endHour": number, "description": string, "type": "deep-work"|"meeting"|"personal"|"blocked", "goalRef": string }

Field guidance:
- name: sharp 2-3 word label specific to THIS user's situation (not generic like "Deep Focus" or "Balanced")
- central_bet: one sentence — what this week is for, what it optimises toward
- central_trap: one sentence — what feels productive but doesn't compound under this bet
- kill_list: 3-5 things NOT happening this week, each with a blunt reason
- drafted_artifacts: 2-3 actual ready-to-send messages — write the full text, not a placeholder. Keep each under 100 words.
- failure_modes: 2-3 pre-mortem entries — name the actual risk, its early warning, the concrete pivot
- events: first, look at the existing calendar to understand how much free time actually exists. If the person has a full-time job with meetings 9-5, their discretionary time is evenings, early mornings, and lunch — plan only in those windows and keep blocks sparse. If they're a founder or freelancer with an open calendar, cover more of the day. The block count should reflect reality: 4-6 blocks for someone with a packed day job, 10-14 for someone with an open schedule. Never schedule over existing events. Never assume time is free that isn't shown as free. Prefer longer focused blocks over many short ones.
- goalRef should reference the goal text it serves

No markdown. No explanation outside the JSON.`;


export async function POST(req: NextRequest) {
  let body: GenerateVariationPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slot, goals, documentsContext, existingEvents, questions, answers } = body;

  if (!goals || goals.length === 0) {
    return NextResponse.json({ error: "At least one goal is required" }, { status: 400 });
  }

  const goalsText = goals
    .sort((a, b) => a.priority - b.priority)
    .map((g, i) => `${i + 1}. ${g.text}${g.currentState ? ` (current: ${g.currentState})` : ""}`)
    .join("\n");

  const calendarText = (existingEvents ?? [])
    .map((e) => `- ${e.day} ${e.startHour}:00-${e.endHour}:00: ${e.title} (${e.type})`)
    .join("\n");

  const qaText = (questions ?? [])
    .map((q) => {
      const ans = (answers ?? []).find((a) => a.questionId === q.id);
      return `Q: ${q.text}\nA: ${ans?.answer ?? "No answer provided"}`;
    })
    .join("\n\n");

  const userMessage = `
## Goals (ranked by priority)
${goalsText}

## Existing Calendar
${calendarText || "No existing events"}

${qaText ? `## Clarification Q&A\n${qaText}\n` : ""}
${documentsContext ? `## Additional Context\n${documentsContext.slice(0, 2000)}\n` : ""}
## Your task
${SLOT_INSTRUCTIONS[slot ?? 0]}

Output the single Variation JSON object.`.trim();

  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: VARIATION_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        stream.on("text", (text) => controller.enqueue(encoder.encode(text)));
        await stream.finalMessage();
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
