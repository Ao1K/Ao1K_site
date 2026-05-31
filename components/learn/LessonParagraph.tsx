function renderBold(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

export default function LessonParagraph({
  paragraph,
}: {
  paragraph: string;
}) {
  return (
    <p className="text-base text-primary-200 sm:text-md mb-4 leading-7">
      {renderBold(paragraph)}
    </p>
  );
}