import type { ReactNode } from "react";

type BadgeTone = "neutral" | "easy" | "medium" | "hard" | "good" | "warn" | "bad";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  easy: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-rose-100 text-rose-800",
  good: "bg-sky-100 text-sky-800",
  warn: "bg-orange-100 text-orange-800",
  bad: "bg-rose-100 text-rose-800",
};

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
