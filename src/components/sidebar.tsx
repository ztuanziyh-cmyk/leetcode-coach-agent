"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/sync", label: "Sync" },
  { href: "/problems", label: "Problems" },
  { href: "/submissions", label: "Submissions" },
  { href: "/review", label: "Daily Review" },
  { href: "/coach", label: "Coach" },
  { href: "/stats", label: "Statistics" },
  { href: "/settings", label: "Settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-slate-200 bg-white/80 px-4 py-5 backdrop-blur md:min-h-screen md:w-72 md:border-r md:border-b-0 md:px-6">
      <div className="flex items-center justify-between gap-4 md:block">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            LEETCODE REVIEW TRACKER
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Review Tracker
          </h1>
          <p className="mt-2 max-w-56 text-sm leading-6 text-slate-600">
            Track solved problems, review notes, and daily practice in one place.
          </p>
        </div>
      </div>

      <nav className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-1">
        {navigation.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          CURRENT STATUS
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Live LeetCode public sync is enabled. Data and review notes are stored locally in this
          browser. No account login or cloud sync yet.
        </p>
      </div>
    </aside>
  );
}
