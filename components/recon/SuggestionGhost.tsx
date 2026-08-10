'use client';

import { colorDict } from '../../utils/sharedConstants';

interface SuggestionGhostProps {
  remaining: string;
  showTabHint: boolean;
  left: number;
  top: number;
  height: number;
}

/**
 * Absolutely-positioned ghost text aligned to the caret, like IDE autocomplete.
 * Lives alongside the contentEditable (not inside it) so showing a suggestion never
 * touches the editable HTML or the caret, while still sharing the editor's frame: it
 * scrolls and slides with the text instead of having to be re-anchored. Box is sized to
 * the measured caret height (not the full line height) so the text sits on the same
 * baseline as the typed text it trails instead of dropping to the bottom of the line box.
 */
export const SuggestionGhost = ({
  remaining,
  showTabHint,
  left,
  top,
  height,
}: SuggestionGhostProps) => {
  if (!remaining) return null;

  return (
    <div
      className={`absolute z-30 pointer-events-none text-[1.125rem] ff-space-adjust whitespace-pre-wrap ${colorDict['suggestion']}`}
      style={{
        left,
        top,
        height: height || undefined,
        lineHeight: height ? `${height}px` : undefined,
      }}
    >
      {remaining}
      {showTabHint ? (
        <img
          src="/tab.svg"
          alt="Press Tab"
          style={{
            display: 'inline',
            width: 51,
            height: 20,
            marginLeft: 8,
            marginBottom: 4,
            verticalAlign: 'middle',
          }}
        />
      ) : null}
    </div>
  );
};
