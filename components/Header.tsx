"use client";
import { useState } from 'react';
import Link from 'next/link';
import HeaderNavLink from './HeaderNavLink';
import WriteIcon from './icons/write';
import DatabaseIcon from './icons/database';
import TimerIcon from './icons/timer';
import List from './icons/list';

export default function Header(): JSX.Element {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="fixed bg-white text-light_accent w-screen z-10 h-16">
      <nav className="mx-auto flex justify-between items-start">
        <div className="text-lg font-bold flex flex-row">
          <img
            src="../Ao1K Logo v2.svg"
            className="h-16 w-full mr-2"

          />
          <div className="md:hidden py-3 px-2">
            <button onClick={toggleSidebar}>
              <List />
            </button>
          </div>
        </div>

        <div className="hidden md:flex space-x-10 p-4 mt-1 flex-row">
          <div onClick={closeSidebar}>
            <HeaderNavLink href="/" title="Practice" icon={<TimerIcon />} />
          </div>
          <HeaderNavLink href="/recon" title="Reconstruct" icon={<WriteIcon />} />
          <HeaderNavLink href="/algs" title="Learn" icon={<DatabaseIcon />} />
        </div>

        <div className="p-4 mt-1 pr-8 hidden md:block">
          <Link href="https://login-ao1k.auth.us-east-1.amazoncognito.com">Profile</Link>
        </div>
      </nav>

      {isSidebarOpen && (
        <div
          className="fixed translate-y-16 inset-0 bg-black bg-opacity-50 z-20"
          onClick={closeSidebar} // Close sidebar when clicking outside
        >
          <div
            className="bg-white w-1/2 h-full p-4 space-y-4"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the sidebar
          >
            <HeaderNavLink href="/" title="Practice" icon={<TimerIcon />} />
            <HeaderNavLink href="/recon" title="Reconstruct" icon={<WriteIcon />} />
            <HeaderNavLink href="/algs" title="Learn" icon={<DatabaseIcon />} />
            <Link href="/not a link" className="block mt-4">
              Profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
