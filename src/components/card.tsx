import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, children, className }: CardProps) {
  return (
    <section
      className={`rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm ${
        className ?? ""
      }`}
    >
      {title ? (
        <header className="mb-5">
          <h3 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
