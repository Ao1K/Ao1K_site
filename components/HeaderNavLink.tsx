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
    <div className={`group relative ${isPath ? 'pointer-events-none' : ''}`}>
      <Link href={href}>
        <div className={`flex flex-row items-center pb-2 mb-3 font-[450] border-b-2 border-transparent
                        ${isPath ? 'border-b-2 border-primary-800' : 'hover:border-b-2 hover:border-dark_accent'}`}>
          {icon}
          <p className="pl-1">{title} <span className="text-neutral-500 font-regular">{version}</span></p>
        </div>
      </Link>
    </div>
  );
}

export default Header;