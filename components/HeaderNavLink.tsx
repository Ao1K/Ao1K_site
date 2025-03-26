'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface HeaderProps {
  href: string;
  title: string;
  version: string;
  icon: React.ReactNode;
}

const Header = ({ href, title, version, icon }: HeaderProps) => {
  const pathname = usePathname();
  const isPath = pathname === href;

  return (
    <div className="group relative">
      <Link href={href}>
        <div className={`flex flex-row items-center pb-2 mb-3 font-[450] border-b-2 border-transparent
                        ${isPath ? 'border-b-2 border-light_accent' : 'hover:border-b-2 hover:border-dark_accent'}`}>
          {icon}
          <p className="pl-1">{title} <span className="text-neutral-500 font-regular">{version}</span></p>
        </div>
      </Link>
      {/* Dropdown revealed on hover */}
      {/* TODO: on screen tap, show this as well */}
      {/* TODO: add changelog as sidebar item/center-screen item */}
      {/* <div className="hidden group-hover:block absolute top-full left-0 bg-white text-neutral-600 font-regular shadow-lg">
        <ul className="flex flex-col px-1 py-2 space-y-1">
          <li>
            <span>Version 0.2.0</span>
          </li>
          <li>
            <a href="/reconChangelog" className="block px-2 py-1 hover:bg-gray-100">Changelog</a>
          </li>
        </ul>
      </div> */}
    </div>
  );
}

export default Header;