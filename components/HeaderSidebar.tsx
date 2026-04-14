import ListIcon from './icons/list';

export default function HeaderSidebar() {
  return (
    <div className="sm:hidden flex w-full justify-end">
      {/* Menu button */}
      <label htmlFor="sidebar-toggle" className="px-3 flex flex-row space-x-2 items-center cursor-pointer">
        <ListIcon />
      </label>
    </div>
  );
}
