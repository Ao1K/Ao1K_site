"use client";

import useLessonHeadings from "../../composables/learn/useLessonHeadings";
import LessonTopicLinks from "./LessonTopicLinks";

export default function LessonNavigator() {
  const { items, activeSlug } = useLessonHeadings();

  if (!items.length) {
    return null;
  }

  return (
    <aside className="hidden xl:block sticky top-0 h-screen w-64 shrink-0 overflow-y-auto bg-primary-900 pt-16">
      <div className="px-6 pt-4 font-semibold text-dark_accent">
        Lesson Topics
      </div>

      <nav className="flex flex-col gap-1 p-4 text-sm">
        <LessonTopicLinks items={items} activeSlug={activeSlug} />
      </nav>
    </aside>
  );
}
