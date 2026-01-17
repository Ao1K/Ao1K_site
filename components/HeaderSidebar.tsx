import HeaderNavLink from './HeaderNavLink';
import WriteIcon from './icons/write';
import ListIcon from './icons/list';
import BulletListIcon from './icons/bulletList';
import SidebarAutoClose from './SidebarAutoClose';

const versionList = {
  "recon": "v0.5",
  "changeblog": "",
}

export default function HeaderSidebar() {
  return (
    <div className="sm:hidden flex w-full justify-end">
      {/* Auto-close sidebar on navigation */}
      <SidebarAutoClose />
      
      {/* Hidden checkbox to manage sidebar state */}
      <input type="checkbox" id="sidebar-toggle" className="peer sr-only" />
      
      {/* Menu button */}
      <label htmlFor="sidebar-toggle" className="px-3 flex flex-row space-x-2 items-center cursor-pointer">
        <ListIcon />
      </label>

      {/* Overlay backdrop - visible when checkbox is checked */}
      <label 
        htmlFor="sidebar-toggle"
        className="hidden peer-checked:block fixed inset-0 translate-y-[60px] bg-black bg-opacity-50 z-50 cursor-default"
        aria-label="Close sidebar"
      />

      {/* Sidebar content */}
      <div className="hidden peer-checked:flex flex-col bg-white space-y-4 fixed top-[60px] right-0 p-4 z-50">
        {/* <HeaderNavLink href="/" title="Practice" icon={<TimerIcon />} /> */}
        <label htmlFor="sidebar-toggle" className="whitespace-nowrap cursor-pointer">
          <HeaderNavLink href="/recon" title="Reconstruct" icon={<WriteIcon />} version={versionList['recon']} />
        </label>
        {/* <HeaderNavLink href="/algs" title="Learn" icon={<DatabaseIcon />} /> */}
        <label htmlFor="sidebar-toggle" className="whitespace-nowrap cursor-pointer">
          <HeaderNavLink href="/changeblog/" title="Changeblog" icon={<BulletListIcon />} version={versionList['changeblog']} />
        </label>
        {/* <Link href="/not a link" className="block mt-4">
          Profile
        </Link> */}
      </div>
    </div>
  );
}
