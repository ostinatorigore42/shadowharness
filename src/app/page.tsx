import Link from "next/link";

function ShadowFigure() {
  return (
    <div className="relative w-20 h-28 mx-auto mb-8">
      <div className="absolute inset-0 bg-indigo-500/25 rounded-full blur-2xl animate-pulse-slow" />
      <svg viewBox="0 0 60 100" className="relative w-full h-full" fill="none">
        <circle cx="30" cy="13" r="10" fill="rgba(99,102,241,0.45)" />
        <path d="M14 28 Q30 22 46 28 L43 62 Q30 58 17 62 Z" fill="rgba(99,102,241,0.45)" />
        <path d="M17 62 L13 90 M43 62 L47 90" stroke="rgba(99,102,241,0.45)" strokeWidth="9" strokeLinecap="round" />
        <path d="M14 33 L4 54 M46 33 L56 54" stroke="rgba(99,102,241,0.45)" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const STEPS = [
  { step: "1", title: "Set your goals", desc: "Rank what matters most this week." },
  { step: "2", title: "Shadow reviews", desc: "AI asks sharp clarifying questions." },
  { step: "3", title: "Pick a plan", desc: "Choose from 3 AI-generated variations." },
  { step: "4", title: "Week built", desc: "Goals become calendar time blocks." },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[96px]" />
        <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[80px]" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-indigo-400/5 rounded-full blur-[64px]" />
      </div>

      <div className="relative max-w-xl animate-fade-in-up">
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-slow" />
          AI-powered week planning
        </div>

        <ShadowFigure />

        <h1 className="text-5xl font-black tracking-tight text-white mb-4">
          Meet your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300">
            Shadow
          </span>
        </h1>

        <p className="text-gray-400 text-lg mb-2">
          There is a version of you living life 10x better.
        </p>
        <p className="text-gray-500 text-base mb-10">
          Shadow Harness plans your next week the way that version would —
          ruthless priorities, no wasted hours, every goal time-blocked.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/setup"
            className="px-8 py-3 rounded-xl bg-[var(--accent)] hover:bg-indigo-500 text-white font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            Plan my week
          </Link>
          <a
            href="#how"
            className="px-8 py-3 rounded-xl border border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-500 font-semibold transition-colors"
          >
            How it works
          </a>
        </div>
      </div>

      <div id="how" className="relative mt-24 max-w-2xl grid sm:grid-cols-4 gap-6 text-left">
        {STEPS.map(({ step, title, desc }, i) => (
          <div
            key={step}
            className={`space-y-1 animate-fade-in-up stagger-${i + 1} p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 hover:border-[var(--accent)]/40 transition-colors`}
          >
            <span className="text-xs text-[var(--accent-light)] font-bold">Step {step}</span>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
