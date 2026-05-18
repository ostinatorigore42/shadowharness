"use client";

import { useState } from "react";
import type { PlanVariation } from "@/lib/types";
import { CalendarWeekView } from "./CalendarWeekView";

interface PlanCardProps {
  variation: PlanVariation;
  selected: boolean;
  onSelect: () => void;
  onRefine?: (comment: string) => Promise<void>;
  allVariations?: PlanVariation[];
}

const CARD_ACCENT: Record<number, string> = {
  0: "border-indigo-500/40 hover:border-indigo-400",
  1: "border-violet-500/40 hover:border-violet-400",
  2: "border-emerald-500/40 hover:border-emerald-400",
};

const SELECTED_ACCENT: Record<number, string> = {
  0: "border-indigo-400 ring-2 ring-indigo-400/40 scale-[1.01]",
  1: "border-violet-400 ring-2 ring-violet-400/40 scale-[1.01]",
  2: "border-emerald-400 ring-2 ring-emerald-400/40 scale-[1.01]",
};

const BADGE_COLOR: Record<number, string> = {
  0: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  1: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  2: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const ARTIFACT_ICONS: Record<string, string> = {
  email: "✉️",
  slack: "💬",
  decline: "🚫",
};

export function PlanCard({ variation, selected, onSelect, onRefine, allVariations }: PlanCardProps) {
  const [showKillList, setShowKillList] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [showFailures, setShowFailures] = useState(false);
  const [comment, setComment] = useState("");
  const [refining, setRefining] = useState(false);
  const [expandedArtifact, setExpandedArtifact] = useState<number | null>(null);

  const idx = Math.min(
    (allVariations ?? [variation]).findIndex((v) => v.id === variation.id),
    2
  ) as 0 | 1 | 2;
  const safeIdx = (idx < 0 ? 0 : idx) as 0 | 1 | 2;

  async function handleRefine(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!comment.trim() || !onRefine) return;
    setRefining(true);
    try {
      await onRefine(comment.trim());
      setComment("");
    } finally {
      setRefining(false);
    }
  }

  return (
    <div
      className={`rounded-xl border bg-[var(--card)] transition-all duration-200 overflow-hidden ${
        selected ? SELECTED_ACCENT[safeIdx] : CARD_ACCENT[safeIdx]
      }`}
    >
      {/* Header — clickable to select */}
      <div className="p-4 cursor-pointer" onClick={onSelect}>
        <div className="flex items-start justify-between mb-2 gap-2">
          <h3 className="font-bold text-white text-base leading-tight">{variation.name}</h3>
          {selected && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)] text-white flex-shrink-0">
              Selected
            </span>
          )}
        </div>

        {/* Central bet — the headline */}
        <p className="text-sm text-gray-200 leading-snug mb-2">{variation.central_bet}</p>

        {/* Central trap */}
        <div className="flex gap-1.5 items-start mb-3">
          <span className="text-yellow-400 text-xs mt-0.5 flex-shrink-0">⚠</span>
          <p className="text-xs text-yellow-200/70 leading-snug">{variation.central_trap}</p>
        </div>

        {/* Stats row */}
        <div className="flex gap-2 text-[10px] text-gray-500 mb-3 flex-wrap">
          <span>{variation.events.length} blocks</span>
          {variation.kill_list?.length > 0 && <span>· {variation.kill_list.length} killed</span>}
          {variation.drafted_artifacts?.length > 0 && <span>· {variation.drafted_artifacts.length} drafts</span>}
          {variation.failure_modes?.length > 0 && <span>· {variation.failure_modes.length} pre-mortems</span>}
        </div>

        {/* Mini calendar */}
        <div className="rounded-lg overflow-hidden border border-[var(--border)]">
          <CalendarWeekView events={variation.events} compact />
        </div>
      </div>

      {/* Expandable sections */}
      <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">

        {/* Kill list */}
        {variation.kill_list?.length > 0 && (
          <div>
            <button
              onClick={() => setShowKillList(!showKillList)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span className="font-medium">Not happening this week ({variation.kill_list.length})</span>
              <span>{showKillList ? "▲" : "▼"}</span>
            </button>
            {showKillList && (
              <div className="px-4 pb-3 space-y-2">
                {variation.kill_list.map((k, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">✕</span>
                    <div>
                      <p className="text-xs text-gray-300 font-medium">{k.item}</p>
                      <p className="text-[10px] text-gray-500">{k.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drafted artifacts */}
        {variation.drafted_artifacts?.length > 0 && (
          <div>
            <button
              onClick={() => setShowArtifacts(!showArtifacts)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span className="font-medium">Ready-to-send drafts ({variation.drafted_artifacts.length})</span>
              <span>{showArtifacts ? "▲" : "▼"}</span>
            </button>
            {showArtifacts && (
              <div className="px-4 pb-3 space-y-2">
                {variation.drafted_artifacts.map((a, i) => (
                  <div key={i} className="rounded-lg border border-[var(--border)] overflow-hidden">
                    <button
                      onClick={() => setExpandedArtifact(expandedArtifact === i ? null : i)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-[var(--muted)] transition-colors text-left"
                    >
                      <span>{ARTIFACT_ICONS[a.type] ?? "📝"}</span>
                      <span className="font-medium capitalize">{a.type}</span>
                      <span className="text-gray-500">→ {a.recipient}</span>
                      <span className="ml-auto text-gray-600">{expandedArtifact === i ? "▲" : "▼"}</span>
                    </button>
                    {expandedArtifact === i && (
                      <div className="px-3 pb-3">
                        <pre className="text-[11px] text-gray-300 whitespace-pre-wrap font-mono leading-relaxed bg-[var(--muted)] rounded p-2 mt-1">
                          {a.text}
                        </pre>
                        <button
                          onClick={() => navigator.clipboard.writeText(a.text)}
                          className="mt-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          Copy to clipboard
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Failure modes */}
        {variation.failure_modes?.length > 0 && (
          <div>
            <button
              onClick={() => setShowFailures(!showFailures)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <span className="font-medium">Pre-mortem ({variation.failure_modes.length})</span>
              <span>{showFailures ? "▲" : "▼"}</span>
            </button>
            {showFailures && (
              <div className="px-4 pb-3 space-y-3">
                {variation.failure_modes.map((f, i) => (
                  <div key={i} className="text-xs space-y-0.5">
                    <p className="text-gray-300 font-medium">{f.what}</p>
                    <p className="text-yellow-400/70">⚡ {f.early_warning}</p>
                    <p className="text-emerald-400/70">→ {f.preventative_response}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve + Refine */}
      <div className="p-4 pt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onSelect}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
            selected
              ? "bg-[var(--accent)] text-white"
              : "border border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-400"
          }`}
        >
          {selected ? "Approved" : "Approve this plan"}
        </button>

        {onRefine && (
          <form onSubmit={handleRefine} className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="I'd change..."
              disabled={refining}
              className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!comment.trim() || refining}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-gray-400 hover:text-white hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {refining ? "…" : "Refine"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
