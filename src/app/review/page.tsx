"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { QuizQuestion } from "@/components/QuizQuestion";
import { useShadowStore } from "@/lib/store";
import { MOCK_CALENDAR_EVENTS } from "@/lib/mock-calendar";
import type { QuizAnswer, AnalyzeResponse } from "@/lib/types";

function parseAnalyzeResponse(raw: string): AnalyzeResponse {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-typing-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}

const REVIEW_MOODS = [
  { label: "Reading your goals",            icon: "◎" },
  { label: "Looking up context",            icon: "⟳" },
  { label: "Mapping your week",             icon: "▣" },
  { label: "Finding the tension",           icon: "◈" },
  { label: "Noticing what's missing",       icon: "◐" },
  { label: "Forming an opinion",            icon: "◆" },
  { label: "Drafting the hard questions",   icon: "◑" },
  { label: "Checking the calendar gaps",    icon: "◉" },
];

function ShadowReading({ searching }: { searching: boolean }) {
  const [moodIdx, setMoodIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (searching) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMoodIdx((i) => (i + 1) % REVIEW_MOODS.length);
        setVisible(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [searching]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 flex items-center gap-3 animate-fade-in-up">
      {searching ? (
        <>
          <span className="text-blue-400 text-lg leading-none animate-pulse">⟳</span>
          <span className="text-sm text-blue-300 font-medium">Searching the web</span>
        </>
      ) : (
        <>
          <span className="text-violet-400 text-lg leading-none animate-pulse">
            {REVIEW_MOODS[moodIdx].icon}
          </span>
          <span
            className="text-sm text-gray-300 font-medium transition-opacity duration-300"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {REVIEW_MOODS[moodIdx].label}
          </span>
        </>
      )}
      <span className="ml-auto flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-violet-400"
            style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </span>
    </div>
  );
}

export default function ReviewPage() {
  const router = useRouter();
  const { goals, currentState, documentsContext, setAssessment, setQuestions, setAnswers } =
    useShadowStore();

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [parsed, setParsed] = useState<AnalyzeResponse | null>(null);
  const [answers, setLocalAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const hasFetched = useRef(false);

  async function fetchAnalysis() {
    setLoading(true);
    setError("");
    setSearching(false);
    setParsed(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals,
          documentsContext,
          existingEvents: MOCK_CALENDAR_EVENTS,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk.includes("\x00SEARCHING\x00")) {
          setSearching(true);
          full += chunk.replaceAll("\x00SEARCHING\x00", "");
        } else {
          setSearching(false);
          full += chunk;
        }
      }

      const data = parseAnalyzeResponse(full);
      setParsed(data);
      setAssessment(data.assessment);
      setQuestions(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchAnalysis();
  }, []);

  function handleAnswerChange(questionId: string, answer: string) {
    setLocalAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }

  function handleSubmit() {
    if (!parsed) return;
    const unanswered = parsed.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      alert(`Please answer all questions (${unanswered.length} remaining).`);
      return;
    }
    const quizAnswers: QuizAnswer[] = parsed.questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? "",
    }));
    setAnswers(quizAnswers);
    router.push("/plans");
  }

  const answeredCount = parsed
    ? Object.values(answers).filter((v) => v.trim()).length
    : 0;
  const totalCount = parsed?.questions.length ?? 0;
  const progressPct = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-12">
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8">
        <span>Setup</span>
        <span>›</span>
        <span className="text-[var(--accent-light)] font-medium">Review</span>
        <span>›</span>
        <span>Plans</span>
        <span>›</span>
        <span>Calendar</span>
      </nav>

      <h1 className="text-3xl font-black text-white mb-1">Reviewing your week</h1>
      <p className="text-gray-400 mb-8">Your better self has a few questions.</p>

      {loading && <ShadowReading searching={searching} />}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3 animate-fade-in-up">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => { hasFetched.current = false; fetchAnalysis(); }}
            className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {parsed && (
        <div className="space-y-8">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 animate-fade-in-up">
            <p className="text-xs text-[var(--accent-light)] font-semibold uppercase tracking-wider mb-2">
              Initial read
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">{parsed.assessment}</p>
          </div>

          <div className="space-y-4 animate-fade-in-up stagger-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Clarifying questions
              </h2>
              <span className="text-xs text-gray-500 tabular-nums">
                {answeredCount} / {totalCount} answered
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {parsed.questions.map((q, i) => (
              <div
                key={q.id}
                className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
              >
                <p className="text-xs text-gray-600 mb-2">
                  {i + 1} / {parsed.questions.length}
                </p>
                <QuizQuestion
                  question={q}
                  answer={answers[q.id] ?? ""}
                  onChange={(ans) => handleAnswerChange(q.id, ans)}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-indigo-500 text-white font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            Generate my plans
          </button>
        </div>
      )}
    </main>
  );
}
