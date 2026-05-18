export interface Goal {
  id: string;
  text: string;
  priority: number;
  currentState?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  startHour: number;
  endHour: number;
  description?: string;
  type: "meeting" | "deep-work" | "personal" | "blocked" | "plan";
  goalRef?: string;
  source: "existing" | "generated";
  date?: string;
  synced?: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: "text" | "select" | "yesno" | "select_or_custom";
  options?: string[];
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
}

export interface KillItem {
  item: string;
  reason: string;
}

export interface Artifact {
  recipient: string;
  type: "email" | "slack" | "decline";
  text: string;
}

export interface FailureMode {
  what: string;
  early_warning: string;
  preventative_response: string;
}

export interface PlanVariation {
  id: string;
  name: string;
  central_bet: string;
  central_trap: string;
  kill_list: KillItem[];
  drafted_artifacts: Artifact[];
  failure_modes: FailureMode[];
  events: CalendarEvent[];
}

export interface AnalyzeResponse {
  assessment: string;
  questions: Question[];
}

export interface GeneratePlansResponse {
  variations: PlanVariation[];
}
