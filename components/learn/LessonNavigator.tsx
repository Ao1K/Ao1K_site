"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type LessonNavigatorItem = {
  slug: string;
  title: string;
  level: "header" | "subheader";
};

const ACTIVE_OFFSET = 144;

function getActiveSlug(items: LessonNavigatorItem[]) {
  let activeSlug = items[0]?.slug ?? "";

  for (const item of items) {
    const heading = document.getElementById(item.slug);

    if (!heading) {
      continue;
    }

    if (heading.getBoundingClientRect().top <= ACTIVE_OFFSET) {
      activeSlug = item.slug;
      continue;
    }

    break;
  }

  return activeSlug;
}

export default function LessonNavigator() {
  const pathname = usePathname();
  const [items, setItems] = useState<LessonNavigatorItem[]>([]);
  const [activeSlug, setActiveSlug] = useState("");

  useEffect(() => {
    let frame = window.requestAnimationFrame(() => {
      const lessonContent = document.querySelector<HTMLElement>("[data-lesson-content]");

      if (!lessonContent) {
        setItems([]);
        setActiveSlug("");
        return;
      }

      const nextItems = Array.from(
        lessonContent.querySelectorAll<HTMLElement>("[data-lesson-heading-level]"),
      )
        .map((heading) => {
          const title = heading.dataset.lessonHeadingLabel?.trim() ?? "";
          const level = heading.dataset.lessonHeadingLevel;

          if (
            !heading.id ||
            !title ||
            (level !== "header" && level !== "subheader")
          ) {
            return null;
          }

          return {
            slug: heading.id,
            title,
            level,
          };
        })
        .filter((item): item is LessonNavigatorItem => item !== null);

      setItems(nextItems);
      setActiveSlug(getActiveSlug(nextItems));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  useEffect(() => {
    if (!items.length) {
      return;
    }

    let frame = 0;

    const updateActive = () => {
      frame = 0;
      setActiveSlug(getActiveSlug(items));
    };

    const scheduleUpdate = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(updateActive);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [items]);

  if (!items.length) {
    return null;
  }

  return (
    <aside className="hidden xl:block sticky top-0 h-screen w-64 shrink-0 overflow-y-auto bg-primary-900 pt-16">
      <div className="px-6 pt-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary-400">
        Lesson Topics
      </div>

      <nav className="flex flex-col gap-1 p-4 text-sm">
        {items.map((item) => {
          const active = item.slug === activeSlug;
          const isSubheader = item.level === "subheader";

          return (
            <a
              key={item.slug}
              href={`#${item.slug}`}
              aria-current={active ? "location" : undefined}
              className={`block rounded py-1.5 px-2 transition-colors 
                ${isSubheader ? "pl-5 text-primary-200" : "font-medium text-primary-300" }
                hover:bg-primary-800 hover:text-primary-100" } 
                ${active ? "bg-primary-800" : ""}`}
            >
              {item.title}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}