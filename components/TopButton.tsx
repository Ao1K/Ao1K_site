import { useEffect } from "react";

export interface ButtonProps {
  id: string;
  text: string;
  onClick: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  shortcutHint?: string;
  icon?: React.ReactNode;
  iconText?: string; // icon or iconText should be used, but not both
  alert: [string, string];
  setAlert: React.Dispatch<React.SetStateAction<[string, string]>>;
}

export default function TopButton({ id, text, onClick, buttonRef, shortcutHint, icon, iconText, alert, setAlert}: ButtonProps) {

  useEffect(() => {
    if (alert && alert[0] === id && alert[1] && setAlert) {
      console.log('alert', alert);
      console.log(id);
      const timeoutId = setTimeout(() => {
        setAlert(['','']) // do not ever set to a truthy value
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  },[alert])

  return (
    <div id={id} className="flex flex-col items-center group relative">
      {alert[0] === id && 
        <div className="py-1 px-2 font-semibold -translate-y-[120%] absolute text-dark bg-light rounded-sm text-sm pointer-events-none select-none z-20 mb-2 whitespace-nowrap">
          {alert[1]}
        </div>
      }
      <button
        ref={buttonRef}
        className="flex items-center justify-center w-10 h-8 rounded-sm hover:bg-primary border border-primary hover:border-light text-dark_accent select-none"
        onClick={onClick}
      >
        {icon || iconText}
      </button>
      <div className={`mt-2 px-1 flex flex-col absolute items-center ${shortcutHint ? 'translate-y-[75%]' : 'translate-y-[140%]' } text-light bg-dark rounded-md text-sm opacity-0 group-hover:opacity-100 pointer-events-none select-none whitespace-nowrap z-30`}>
        <div>{text}</div>
        {shortcutHint ? (<div>({shortcutHint})</div>) : (<div></div>)}
      </div>
    </div>
  );
}
