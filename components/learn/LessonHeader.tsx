function toSlug(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

export default function LessonHeader({
  header,
}: {
  header: string;
}) {
  const slug = toSlug(header);
  return (
    <div
      id={slug}
      data-lesson-heading-level="header"
      data-lesson-heading-label={header}
      className="scroll-mt-24 mt-12 mb-4"
    >
      <h2 className="group text-xl font-medium tracking-tight text-primary-400 sm:text-2xl mb-1">
        <a href={`#${slug}`} className="">
          {header}
          <span className="ml-2 opacity-0 group-hover:opacity-40 transition-opacity text-primary-300">#</span>
        </a>
      </h2>
      <hr className="border-neutral-600" />
    </div>
  );
}