"use client";
import { useState } from 'react';
import HeaderNavLink from './HeaderNavLink';
import WriteIcon from './icons/write';
import ListIcon from './icons/list';
import BulletListIcon from './icons/bulletList';

const versionList = {
  "recon": "v0.5",
  "changeblog": "",
}

export default function HeaderSidebar() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <>
      <div className="sm:hidden flex flex-row justify-end">
        <button onClick={toggleSidebar} className="px-3 flex flex-row space-x-2 items-center">
          <ListIcon />
          <div className="text-xl">Tools</div>
        </button>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed translate-y-[60px] inset-0 bg-black bg-opacity-50 z-50"
          onClick={closeSidebar} // Close sidebar when clicking outside
        >
          <div
            className="bg-white w-1/2 h-full p-4 space-y-4 fixed right-0 top-0"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the sidebar
          >
            {/* <HeaderNavLink href="/" title="Practice" icon={<TimerIcon />} /> */}
            <button onClick={closeSidebar} className="">
              <HeaderNavLink href="/recon" title="Reconstruct" icon={<WriteIcon />} version={versionList['recon']} />
            </button>
            {/* <HeaderNavLink href="/algs" title="Learn" icon={<DatabaseIcon />} /> */}
            <button onClick={closeSidebar} className="">
              <HeaderNavLink href="/changeblog/" title="Changeblog" icon={<BulletListIcon />} version={versionList['changeblog']} />
            </button>
            {/* <Link href="/not a link" className="block mt-4">
            Profile
          </Link> */}
            <div>
              By Chet
            </div>
          </div>
        </div>
      )}
    </>
  );
}
