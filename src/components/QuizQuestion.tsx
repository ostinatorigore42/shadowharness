"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";

interface QuizQuestionProps {
  question: Question;
  answer: string;
  onChange: (answer: string) => void;
}

export function QuizQuestion({ question, answer, onChange }: QuizQuestionProps) {
  const [customMode, setCustomMode] = useState(false);

  const isCustom =
    question.type !== "text" &&
    answer !== "" &&
    answer !== "Yes" &&
    answer !== "No" &&
    !(question.options ?? []).includes(answer);

  function handleOptionClick(opt: string) {
    setCustomMode(false);
    onChange(opt);
  }

  function handleCustomToggle() {
    setCustomMode(true);
    onChange("");
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-200">{question.text}</p>

      {question.type === "yesno" && !customMode && !isCustom && (
        <div className="flex gap-2 flex-wrap">
          {["Yes", "No"].map((opt) => (
            <button
              key={opt}
              onClick={() => handleOptionClick(opt)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                answer === opt
                  ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                  : "border-[var(--border)] text-gray-400 hover:border-[var(--accent-light)] hover:text-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
          <button
            onClick={handleCustomToggle}
            className="px-4 py-2 rounded-lg border border-dashed border-[var(--border)] text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors"
          >
            Other…
          </button>
        </div>
      )}

      {(question.type === "select" || question.type === "select_or_custom") && question.options && !customMode && !isCustom && (
        <div className="flex flex-col gap-1.5">
          {question.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleOptionClick(opt)}
              className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                answer === opt
                  ? "bg-[var(--accent)]/20 border-[var(--accent)] text-white"
                  : "border-[var(--border)] text-gray-400 hover:border-[var(--accent-light)] hover:text-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
          <button
            onClick={handleCustomToggle}
            className="text-left px-4 py-2.5 rounded-lg border border-dashed border-[var(--border)] text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors"
          >
            Other — type my own…
          </button>
        </div>
      )}

      {(question.type === "text" || customMode || isCustom) && (
        <div className="space-y-1.5">
          {(customMode || isCustom) && question.type !== "text" && (
            <button
              onClick={() => { setCustomMode(false); onChange(""); }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Back to options
            </button>
          )}
          <textarea
            value={answer}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Your answer..."
            rows={2}
            autoFocus={customMode}
            className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>
      )}
    </div>
  );
}
