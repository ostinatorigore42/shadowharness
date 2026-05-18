"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Goal, Question, QuizAnswer, PlanVariation, CalendarEvent } from "./types";

interface ShadowState {
  // Step 1 — Setup
  goals: Goal[];
  currentState: string;
  documentsContext: string;

  // Step 2 — Review
  assessment: string;
  questions: Question[];
  answers: QuizAnswer[];

  // Step 3 — Plans
  variations: PlanVariation[];
  selectedVariationId: string | null;

  // Step 4 — Calendar
  calendarEvents: CalendarEvent[];

  // Actions
  setGoals: (goals: Goal[]) => void;
  setCurrentState: (state: string) => void;
  setDocumentsContext: (ctx: string) => void;
  setAssessment: (assessment: string) => void;
  setQuestions: (questions: Question[]) => void;
  setAnswers: (answers: QuizAnswer[]) => void;
  setVariations: (variations: PlanVariation[] | ((prev: PlanVariation[]) => PlanVariation[])) => void;
  selectVariation: (id: string) => void;
  setCalendarEvents: (events: CalendarEvent[]) => void;
  resetPlan: () => void;
  reset: () => void;
}

const initialState = {
  goals: [],
  currentState: "",
  documentsContext: "",
  assessment: "",
  questions: [],
  answers: [],
  variations: [],
  selectedVariationId: null,
  calendarEvents: [],
};

export const useShadowStore = create<ShadowState>()(
  persist(
    (set) => ({
      ...initialState,
      setGoals: (goals) => set({ goals }),
      setCurrentState: (currentState) => set({ currentState }),
      setDocumentsContext: (documentsContext) => set({ documentsContext }),
      setAssessment: (assessment) => set({ assessment }),
      setQuestions: (questions) => set({ questions }),
      setAnswers: (answers) => set({ answers }),
      setVariations: (variations) =>
        set((state) => ({
          variations: typeof variations === "function" ? variations(state.variations) : variations,
        })),
      selectVariation: (selectedVariationId) => set({ selectedVariationId }),
      setCalendarEvents: (calendarEvents) => set({ calendarEvents }),
      resetPlan: () => set({
        assessment: "",
        questions: [],
        answers: [],
        variations: [],
        selectedVariationId: null,
        calendarEvents: [],
      }),
      reset: () => set(initialState),
    }),
    { name: "shadow-harness-state" }
  )
);
