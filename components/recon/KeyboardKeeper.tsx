import type { Ref } from 'react';

export const KEYBOARD_KEEPER_SELECTOR = '[data-keyboard-keeper]';

interface KeyboardKeeperProps {
  ref?: Ref<HTMLSpanElement>;
}

export const KeyboardKeeper = ({ ref }: KeyboardKeeperProps) => (
  <span
    ref={ref}
    data-keyboard-keeper=""
    contentEditable
    suppressContentEditableWarning
    spellCheck={false}
    autoCorrect="off"
    autoCapitalize="off"
    aria-hidden="true"
    tabIndex={-1}
    className="absolute right-2 top-1/2 w-px h-px opacity-0 outline-none caret-transparent"
  />
);

export default KeyboardKeeper;
