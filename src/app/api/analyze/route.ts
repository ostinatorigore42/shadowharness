import { NextRequest, NextResponse } from "next/server";
import { anthropic, CLAUDE_MODEL, ANALYZE_SYSTEM_PROMPT } from "@/lib/claude";
import type { Goal, CalendarEvent } from "@/lib/types";

interface AnalyzePayload {
  goals: Goal[];
  documentsContext: string;
  existingEvents: CalendarEvent[];
}

export async function POST(req: NextRequest) {
  let body: AnalyzePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { goals, documentsContext, existingEvents } = body;

  if (!goals || goals.length === 0) {
    return NextResponse.json({ error: "At least one goal is required" }, { status: 400 });
  }

  const goalsText = goals
    .sort((a, b) => a.priority - b.priority)
    .map((g, i) => {
      const state = g.currentState?.trim();
      return `${i + 1}. ${g.text}${state ? `\n   Current state: ${state}` : ""}`;
    })
    .join("\n");

  const calendarText = (existingEvents ?? [])
    .map((e) => `- ${e.day} ${e.startHour}:00-${e.endHour}:00: ${e.title} (${e.type})`)
    .join("\n");

  const userMessage = `
## My Goals (ranked by priority)
${goalsText}

## My Existing Calendar This Week
${calendarText || "No existing events"}

${documentsContext ? `## Additional Context (from uploaded docs)\n${documentsContext.slice(0, 3000)}` : ""}

Please analyze this and return your assessment + clarifying questions as JSON.`.trim();

  // Use web_search tool so Claude can look up any events, companies, or projects mentioned.
  // stream.on('text', ...) fires only on final text chunks — tool_use blocks are handled
  // internally by the SDK and don't break the stream.
  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    system: ANALYZE_SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search" } as never],
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Use .on('text') which only fires for text deltas, skipping tool_use blocks
        stream.on("text", (text) => {
          controller.enqueue(encoder.encode(text));
        });

        // Also stream a signal when web search fires so the client can show an indicator
        stream.on("streamEvent", (event) => {
          if (
            event.type === "content_block_start" &&
            "content_block" in event &&
            (event.content_block as { type: string }).type === "tool_use"
          ) {
            controller.enqueue(encoder.encode("\x00SEARCHING\x00"));
          }
        });

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
