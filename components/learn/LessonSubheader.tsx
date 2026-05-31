function toSlug(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

export default function LessonSubheader({
  header,
}: {
  header: string;
}) {
  const slug = toSlug(header);
  return (
    <h2
      id={slug}
      data-lesson-heading-level="subheader"
      data-lesson-heading-label={header}
      className="scroll-mt-24 group text-xl font-sm tracking-tight text-dark_accent sm:text-xl mt-3 mb-4"
    >
      <a href={`#${slug}`} className="">
        {header}
        <span className="ml-2 opacity-0 group-hover:opacity-40 transition-opacity">#</span>
      </a>
    </h2>
  );
}