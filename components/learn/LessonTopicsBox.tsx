"use client";

import useLessonHeadings from "../../composables/learn/useLessonHeadings";
import LessonTopicLinks from "./LessonTopicLinks";

export default function LessonTopicsBox() {
  const { items, activeSlug } = useLessonHeadings();

  if (!items.length) {
    return null;
  }

  return (
    <details className="group xl:hidden mt-6 rounded border border-neutral-600 bg-primary-900">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 font-semibold text-dark_accent [&::-webkit-details-marker]:hidden">
        <span className="inline-block -rotate-90 text-xs transition-transform duration-200 group-open:rotate-0">
          ▼
        </span>
        Lesson Topics
      </summary>

      <nav className="flex flex-col gap-1 px-4 pb-4 text-sm">
        <LessonTopicLinks items={items} activeSlug={activeSlug} />
      </nav>
    </details>
  );
}
