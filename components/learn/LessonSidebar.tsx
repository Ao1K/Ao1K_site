"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { lessons } from "./lessons";

export default function LessonSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // group lessons by category
  const categories: Record<string, typeof lessons> = {};
  for (const lesson of lessons) {
    (categories[lesson.category] ??= []).push(lesson);
  }

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const sidebar = (
    <nav className="flex flex-col gap-1 p-4 text-sm">
      <Link
        href="/learn"
        onClick={() => setOpen(false)}
        onMouseEnter={() => router.prefetch("/learn")}
        className={`block py-1.5 px-2 rounded mb-2 transition-colors font-medium ${
          pathname === "/learn"
            ? "bg-primary-700 text-primary-100"
            : "text-primary-200 hover:bg-primary-800 hover:text-primary-100"
        }`}
      >
        Overview
      </Link>

      {Object.entries(categories).map(([category, catLessons]) => (
        <div key={category}>
          <button
            onClick={() => toggle(category)}
            className="flex items-center gap-1.5 w-full py-2 text-primary-300 font-medium hover:text-primary-200 transition-colors"
          >
            <span
              className={`inline-block transition-transform duration-200 text-xs ${
                collapsed[category] ? "-rotate-90" : ""
              }`}
            >
              ▼
            </span>
            {category}
          </button>

          <div
            className={`overflow-hidden transition-[max-height] duration-200 ${
              collapsed[category] ? "max-h-0" : "max-h-[1000px]"
            }`}
          >
            <ul className="flex flex-col gap-0.5 pl-4 pb-2">
              {catLessons.map((lesson) => {
                const href = `/learn/${lesson.slug}`;
                const active = pathname === href;
                return (
                  <li key={lesson.slug}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => router.prefetch(href)}
                      className={`block py-1.5 px-2 rounded transition-colors ${
                        active
                          ? "bg-primary-700 text-primary-100"
                          : "text-primary-200 hover:bg-primary-800 hover:text-primary-100"
                      }`}
                    >
                      {lesson.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* mobile toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="md:hidden fixed bottom-4 left-4 z-50 bg-primary-700 text-primary-100 rounded-full w-11 h-11 flex items-center justify-center shadow-lg"
        aria-label="Toggle sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-40 h-screen w-64 bg-primary-900 border-r border-primary-700 overflow-y-auto pt-16 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      {/* desktop sidebar */}
      <aside className="hidden md:block sticky top-0 h-screen w-56 shrink-0 overflow-y-auto pt-16 border-r border-primary-700 bg-primary-900">
        {sidebar}
      </aside>
    </>
  );
}
