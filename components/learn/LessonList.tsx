function renderBold(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i} className="font-normal">{part}</span>
  );
}

interface LessonListProps {
  style?: 'alpha' | 'decimal';
  items: string[];
}

export default function LessonList({ items, style = 'decimal' }: LessonListProps) {
  return (
    <ol className={`list-inside font-bold text-base text-neutral-400 leading-relaxed sm:text-md space-y-2 mb-4 pb-4" 
      ${style === 'alpha' ? 'list-disc' : 'list-decimal'}`}
    >
      {items.map((item, index) => (
        <li className="whitespace-pre-wrap" key={index}>{renderBold(item)}</li>
      ))}
    </ol>
  );
}
