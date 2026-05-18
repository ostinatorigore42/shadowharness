"use client";

import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Goal } from "@/lib/types";

interface SortableGoalProps {
  goal: Goal;
  index: number;
  onRemove: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onStateChange: (id: string, state: string) => void;
}

function SortableGoal({ goal, index, onRemove, onEdit, onStateChange }: SortableGoalProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal.text);
  const [expanded, setExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: goal.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed) onEdit(goal.id, trimmed);
    else setDraft(goal.text);
    setEditing(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden group">
      <div className="flex items-center gap-3 p-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 touch-none flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          </svg>
        </button>

        <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
          {index + 1}
        </span>

        {editing ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") { setDraft(goal.text); setEditing(false); }
            }}
            autoFocus
            className="flex-1 bg-transparent border-b border-[var(--accent)] text-sm text-gray-200 focus:outline-none py-0.5"
          />
        ) : (
          <span
            className="flex-1 text-sm text-gray-200 cursor-text"
            onDoubleClick={() => setEditing(true)}
          >
            {goal.text}
          </span>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className={`text-xs px-2 py-0.5 rounded border transition-colors flex-shrink-0 ${
            goal.currentState
              ? "border-[var(--accent)]/50 text-[var(--accent-light)]"
              : "border-[var(--border)] text-gray-600 hover:text-gray-400"
          }`}
        >
          {goal.currentState ? "context ✓" : "+ context"}
        </button>

        <button
          onClick={() => onRemove(goal.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[var(--border)]/50 pt-2">
          <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">
            Current state for this goal
          </p>
          <textarea
            value={goal.currentState ?? ""}
            onChange={(e) => onStateChange(goal.id, e.target.value)}
            placeholder="Where are you on this right now? What's blocking it? What's already done?"
            rows={2}
            autoFocus
            className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>
      )}
    </div>
  );
}

interface GoalsListProps {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
}

export function GoalsList({ goals, onChange }: GoalsListProps) {
  const [newText, setNewText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = goals.findIndex((g) => g.id === active.id);
      const newIndex = goals.findIndex((g) => g.id === over.id);
      onChange(
        arrayMove(goals, oldIndex, newIndex).map((g, i) => ({ ...g, priority: i + 1 }))
      );
    }
  }

  function addGoal() {
    const text = newText.trim();
    if (!text) return;
    onChange([...goals, { id: crypto.randomUUID(), text, priority: goals.length + 1 }]);
    setNewText("");
    inputRef.current?.focus();
  }

  function removeGoal(id: string) {
    onChange(goals.filter((g) => g.id !== id).map((g, i) => ({ ...g, priority: i + 1 })));
  }

  function editGoal(id: string, text: string) {
    onChange(goals.map((g) => (g.id === id ? { ...g, text } : g)));
  }

  function updateState(id: string, currentState: string) {
    onChange(goals.map((g) => (g.id === id ? { ...g, currentState } : g)));
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          {goals.map((goal, index) => (
            <SortableGoal
              key={goal.id}
              goal={goal}
              index={index}
              onRemove={removeGoal}
              onEdit={editGoal}
              onStateChange={updateState}
            />
          ))}
        </SortableContext>
      </DndContext>

      {goals.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">No goals yet. Add your first one below.</p>
      )}

      <div className="flex gap-2 mt-2">
        <input
          ref={inputRef}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addGoal(); }}
          placeholder="Type a goal and press Enter..."
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={addGoal}
          disabled={!newText.trim()}
          className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
