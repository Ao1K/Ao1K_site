import Link from "next/link";
import CaretIcon from "../icons/dropdown";
import { lessons } from "./lessons";

export default function LessonFooterNav({ slug }: { slug: string }) {
  const index = lessons.findIndex((lesson) => lesson.slug === slug);

  if (index === -1) return null;

  const previous = lessons[index - 1];
  const next = lessons[index + 1];

  if (!previous && !next) return null;

  return (
    <nav className="mt-12 flex flex-col gap-6 rounded-sm bg-dark_accent py-4 px-5 text-base font-medium text-dark sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      {previous ? (
        <Link
          href={`/learn/${previous.slug}`}
          className="flex items-center gap-2 self-start underline underline-offset-4 sm:no-underline sm:hover:underline"
        >
          <CaretIcon className="shrink-0 text-xl rotate-90" />
          Previous Lesson: {previous.title}
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next && (
        <Link
          href={`/learn/${next.slug}`}
          className="flex items-center gap-2 self-end text-right underline underline-offset-4 sm:no-underline sm:hover:underline"
        >
          Next Lesson: {next.title}
          <CaretIcon className="shrink-0 text-xl -rotate-90" />
        </Link>
      )}
    </nav>
  );
}
