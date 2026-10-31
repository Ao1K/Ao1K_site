import type { LessonHeadingItem } from "../../composables/learn/useLessonHeadings";

export default function LessonTopicLinks({
  items,
  activeSlug,
  onNavigate,
}: {
  items: LessonHeadingItem[];
  activeSlug: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active = item.slug === activeSlug;
        const isSubheader = item.level === "subheader";

        return (
          <a
            key={item.slug}
            href={`#${item.slug}`}
            onClick={onNavigate}
            aria-current={active ? "location" : undefined}
            className={`block rounded py-1.5 px-2 transition-colors hover:bg-primary-800 hover:text-primary-100
              ${isSubheader ? "pl-5 text-primary-200" : "font-medium text-primary-300"}
              ${active ? "bg-primary-700" : ""}`}
          >
            {item.title}
          </a>
        );
      })}
    </>
  );
}
