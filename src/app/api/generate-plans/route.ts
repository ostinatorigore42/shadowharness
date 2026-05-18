import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, GENERATE_PLANS_SYSTEM_PROMPT } from "@/lib/claude";
import type { Goal, Question, QuizAnswer, CalendarEvent } from "@/lib/types";

interface GeneratePlansPayload {
  goals: Goal[];
  currentState: string;
  documentsContext: string;
  existingEvents: CalendarEvent[];
  questions: Question[];
  answers: QuizAnswer[];
}

export async function POST(req: NextRequest) {
  let body: GeneratePlansPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { goals, currentState, documentsContext, existingEvents, questions, answers } = body;

  if (!goals || goals.length === 0) {
    return NextResponse.json({ error: "At least one goal is required" }, { status: 400 });
  }

  const goalsText = goals
    .sort((a, b) => a.priority - b.priority)
    .map((g, i) => `${i + 1}. ${g.text}`)
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

## Current State
${currentState?.trim() || "Not provided"}

## Existing Calendar
${calendarText || "No existing events"}

${qaText ? `## Clarification Q&A\n${qaText}` : ""}

${documentsContext ? `## Additional Context\n${documentsContext.slice(0, 2000)}` : ""}

Generate exactly 3 plan variations as JSON.`.trim();

  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: GENERATE_PLANS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
