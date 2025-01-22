"use client";
import { useState } from 'react';
import Link from 'next/link';
import HeaderNavLink from './HeaderNavLink';
import WriteIcon from './icons/write';
// import DatabaseIcon from './icons/database';
// import TimerIcon from './icons/timer';
import ListIcon from './icons/list';

export default function Header(): JSX.Element {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="fixed bg-white text-light_accent w-full z-50 h-16 top-0 right-0">
      <nav className="mx-auto flex justify-between w-full">

        <img
          src="/Ao1K Logo v2.svg"
          className="h-16 w-auto overflow-visible"
        />

        <div className="hidden sm:flex p-4 mt-1 flex-row"> {/* space-x-10 */}
          <div onClick={closeSidebar}>
          {/* <HeaderNavLink href="/" title="Practice" icon={<TimerIcon />} /> */}
          </div>
          <HeaderNavLink href="/recon" title="Reconstruct" icon={<WriteIcon />} />
          {/* <HeaderNavLink href="/algs" title="Learn" icon={<DatabaseIcon />} /> */}
        </div>

        <div className="p-4 mt-1 hidden sm:block">
          {/* <Link href="https://login-ao1k.auth.us-east-1.amazoncognito.com">Profile</Link> */}
          By Chet
        </div>

        <div className="sm:hidden flex flex-row justify-end">
          <button onClick={toggleSidebar} className="px-3 flex flex-row space-x-2 items-center">
            <ListIcon />
            <div className="text-xl">Tools</div>
          </button>
        </div>
      </nav>


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
        <HeaderNavLink href="/recon" title="Reconstruct" icon={<WriteIcon />} />
        {/* <HeaderNavLink href="/algs" title="Learn" icon={<DatabaseIcon />} /> */}
        {/* <Link href="/not a link" className="block mt-4">
          Profile
        </Link> */}
        By Chet
        </div>
      </div>
      )}
    </div>
  );
}
