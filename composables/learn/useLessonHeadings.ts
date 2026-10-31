import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { toHeadingSlug } from "../../components/learn/LessonHeading";

export type LessonHeadingItem = {
  slug: string;
  title: string;
  level: "header" | "subheader";
};

const ACTIVE_OFFSET = 144;

function collectHeadings(lessonContent: HTMLElement) {
  const usedSlugs = new Set<string>();
  const generatedSlugCounts = new Map<string, number>();

  return Array.from(lessonContent.querySelectorAll<HTMLHeadingElement>("h1, h2"))
    .map((heading) => {
      const title = heading.textContent?.trim() ?? "";

      if (!title) {
        return null;
      }

      const level = heading.tagName === "H1" ? "header" : "subheader";
      let slug = heading.id.trim();

      if (!slug) {
        const baseSlug = toHeadingSlug(title);

        if (!baseSlug) {
          return null;
        }

        const nextIndex = (generatedSlugCounts.get(baseSlug) ?? 0) + 1;
        generatedSlugCounts.set(baseSlug, nextIndex);
        slug = nextIndex === 1 ? baseSlug : `${baseSlug}-${nextIndex}`;
      }

      if (usedSlugs.has(slug)) {
        const baseSlug = slug;
        let nextIndex = (generatedSlugCounts.get(baseSlug) ?? 1) + 1;

        while (usedSlugs.has(`${baseSlug}-${nextIndex}`)) {
          nextIndex += 1;
        }

        generatedSlugCounts.set(baseSlug, nextIndex);
        slug = `${baseSlug}-${nextIndex}`;
      }

      usedSlugs.add(slug);
      heading.id = slug;

      return {
        slug,
        title,
        level,
      };
    })
    .filter((item): item is LessonHeadingItem => item !== null);
}

function getActiveSlug(items: LessonHeadingItem[]) {
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

export default function useLessonHeadings() {
  const pathname = usePathname();
  const [items, setItems] = useState<LessonHeadingItem[]>([]);
  const [activeSlug, setActiveSlug] = useState("");

  useEffect(() => {
    let frame = window.requestAnimationFrame(() => {
      const lessonContent = document.querySelector<HTMLElement>("[data-lesson-content]");

      if (!lessonContent) {
        setItems([]);
        setActiveSlug("");
        return;
      }

      const nextItems = collectHeadings(lessonContent);

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

  return { items, activeSlug };
}
