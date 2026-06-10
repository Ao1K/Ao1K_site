import Link from "next/link";

export default function LessonLink({
  text,
  href,
}: {
  text: string;
  href: string;
}) {
  return (
    <span className="mb-4">
      <Link
        href={href}
        target="_blank"
        className="text-base text-primary-400 underline underline-offset-4 hover:text-primary-300 transition-colors"
      >
        {text}
      </Link>
    </span>
  );
}
