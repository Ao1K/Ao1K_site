export type FeedbackNoteCategory = 'great' | 'good' | 'okay' | 'bad';

export interface FeedbackNote {
  category: FeedbackNoteCategory | null;
  text: string;
}

const NOTE_SYMBOLS: Record<FeedbackNoteCategory, string> = {
  great: '++',
  good: '+',
  okay: '-',
  bad: '--',
};

const NOTE_COLOR_CLASSES: Record<FeedbackNoteCategory, string> = {
  great: 'text-cube-blue',
  good: 'text-cube-green',
  okay: 'text-cube-orange',
  bad: 'text-cube-red',
};

export default function FeedbackNotes({ notes }: { notes: readonly FeedbackNote[] }) {
  return (
    <ul className="pl-1">
      {notes.map(({ category, text }) => (
        <li key={text} className="flex flex-row gap-1.5">
          <span className={`w-[2ch] shrink-0 text-right font-medium ${category ? NOTE_COLOR_CLASSES[category] : ''}`}>
            {category && NOTE_SYMBOLS[category]}
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
