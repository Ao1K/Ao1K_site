interface ButtonProps {
  text: string;
  shortcutHint: string;
  icon: React.ReactNode;
  onClick: any;
}

export default function UndoRedoButton({ text, shortcutHint, icon, onClick }: ButtonProps) {

  return (
    <div className="relative inline-block group" >
      <button
        className="flex flex-row align-middle items-center space-x-2 px-2 py-1 my-1 rounded-sm hover:bg-primary border border-primary text-light"
        onClick={onClick}
      >
        <div className="">{icon}</div>
      </button>
      <div className="flex flex-col absolute left-1/2 whitespace-nowrap transform -translate-x-1/2 text-light rounded-md text-sm opacity-0 items-center group-hover:opacity-100 group-hover:delay-1000 pointer-events-none select-none">
        <div>{text}</div>
        <div className="">({shortcutHint})</div>
      </div>
    </div>
  );
}