import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, REFINE_PLAN_SYSTEM_PROMPT } from "@/lib/claude";
import type { Goal, Question, QuizAnswer, CalendarEvent, PlanVariation } from "@/lib/types";

interface RefinePlanPayload {
  variation: PlanVariation;
  comment: string;
  goals: Goal[];
  questions: Question[];
  answers: QuizAnswer[];
  existingEvents: CalendarEvent[];
}

function parseVariation(raw: string): PlanVariation {
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  let body: RefinePlanPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { variation, comment, goals, questions, answers, existingEvents } = body;

  if (!variation || !comment?.trim()) {
    return NextResponse.json({ error: "variation and comment are required" }, { status: 400 });
  }

  const goalsText = (goals ?? [])
    .sort((a, b) => a.priority - b.priority)
    .map((g, i) => `${i + 1}. ${g.text}${g.currentState ? ` (current: ${g.currentState})` : ""}`)
    .join("\n");

  const qaText = (questions ?? [])
    .map((q) => {
      const ans = (answers ?? []).find((a) => a.questionId === q.id);
      return `Q: ${q.text}\nA: ${ans?.answer ?? "No answer provided"}`;
    })
    .join("\n\n");

  const calendarText = (existingEvents ?? [])
    .map((e) => `- ${e.day} ${e.startHour}:00-${e.endHour}:00: ${e.title} (${e.type})`)
    .join("\n");

  const userMessage = `
## Goals (ranked by priority)
${goalsText}

## Existing Calendar
${calendarText || "No existing events"}

${qaText ? `## Clarification Q&A\n${qaText}\n` : ""}
## Current variation to refine
${JSON.stringify(variation, null, 2)}

## User's comment
${comment.trim()}

Produce a revised version of this variation that addresses the comment while keeping the same strategic bet intact unless the comment explicitly challenges it.`.trim();

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: REFINE_PLAN_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const refined = parseVariation(raw);
    refined.id = variation.id;

    return NextResponse.json(refined);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Refinement failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
