export interface ButtonProps {
  id: string;
  text: string;
  shortcutHint: string;
  onClick: any;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  icon?: React.ReactNode;
  iconText?: string; // icon or iconText should be used, but not both
  isOverflow?: boolean;
}

export default function ToolbarButton({ id, text, shortcutHint, onClick, icon, iconText, buttonRef, isOverflow }: ButtonProps) {

  return (
    <div id={id} className={`relative inline-block group`} >
      <button ref={buttonRef}
        className="flex flex-row align-middle w-10 h-8 px-2 py-1 rounded-sm hover:bg-neutral-600 border border-neutral-600 text-primary-100 select-none"
        onClick={onClick}
      >
        <div className="flex justify-center items-center w-full select-none">{icon || iconText}</div>
      </button>
      <div className={`flex flex-col absolute transform ${isOverflow ? 'right-[125%] -translate-y-[100%] text-right' : 'left-1/2 -translate-x-1/2 items-center'} whitespace-nowrap text-primary-100 bg-primary-900 rounded-md text-sm opacity-0 group-hover:opacity-100 group-hover:delay-100 pointer-events-none select-none`}>
        <div>{text}</div>
        <div>({shortcutHint})</div>
      </div>
    </div>
  );
}
