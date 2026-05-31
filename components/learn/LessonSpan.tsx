function renderBold(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

export default function LessonSpan({
  span,
}: {
  span: string;
}) {
  return (
    <span className="text-base text-primary-200 sm:text-md leading-7">
      {renderBold(span)}
    </span>
  );
}