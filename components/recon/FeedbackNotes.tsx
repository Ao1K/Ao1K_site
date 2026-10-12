import Link from 'next/link';
import { FEEDBACK_CATEGORY_ORDER, type FeedbackCategory } from '../../utils/sharedConstants';

export interface NoteLink {
  text: string;
  href: string;
}

export type NoteSegment = string | NoteLink;

export interface FeedbackNote {
  category: FeedbackCategory | null;
  text: string | readonly NoteSegment[];
}

const NOTE_SYMBOLS: Record<FeedbackCategory, string> = {
  great: '++',
  good: '+',
  okay: '-',
  bad: '--',
};

const CATEGORY_COLOR_CLASSES: Record<FeedbackCategory, string> = {
  great: 'text-cube-blue',
  good: 'text-cube-green',
  okay: 'text-cube-orange',
  bad: 'text-cube-red',
};

const LINK_CLASSES = 'underline underline-offset-2 hover:text-primary-100';

const categoryRank = (category: FeedbackCategory | null) =>
  category ? FEEDBACK_CATEGORY_ORDER.indexOf(category) : FEEDBACK_CATEGORY_ORDER.length;

const toSegments = (text: FeedbackNote['text']): readonly NoteSegment[] => (typeof text === 'string' ? [text] : text);

const plainText = (text: FeedbackNote['text']) =>
  toSegments(text).map(segment => (typeof segment === 'string' ? segment : segment.text)).join('');

function NoteSegmentView({ segment }: { segment: NoteSegment }) {
  if (typeof segment === 'string') return segment;

  const isInternal = segment.href.startsWith('/');
  const linkView = isInternal ? (
    <Link href={segment.href} className={LINK_CLASSES}>
      {segment.text}
    </Link>
  ) : (
    <a href={segment.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
      {segment.text}
    </a>
  );
  return linkView;
}

export default function FeedbackNotes({ notes }: { notes: readonly FeedbackNote[] }) {
  const sortedNotes = notes.toSorted((a, b) => categoryRank(a.category) - categoryRank(b.category));

  return (
    <ul className="pl-1">
      {sortedNotes.map(({ category, text }) => (
        <li key={plainText(text)} className="flex flex-row gap-1.5">
          <span className={`w-[2ch] shrink-0 text-right font-medium ${category ? CATEGORY_COLOR_CLASSES[category] : ''}`}>
            {category && NOTE_SYMBOLS[category]}
          </span>
          <span>
            {toSegments(text).map((segment, index) => (
              <NoteSegmentView key={index} segment={segment} />
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  great: 'Great',
  good: 'Good',
  okay: 'Okay',
  bad: 'Needs work',
};

export function FeedbackLabel({ category, className }: { category: FeedbackCategory | null; className?: string }) {
  const colorClass = category ? CATEGORY_COLOR_CLASSES[category] : 'text-neutral-400';
  return (
    <span className={`font-medium whitespace-nowrap ${colorClass} ${className ?? ''}`}>
      {category ? CATEGORY_LABELS[category] : 'Unknown'}
    </span>
  );
}
