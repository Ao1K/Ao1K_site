'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface HeaderProps {
  href: string;
  title: string;
  version: string;
  icon: React.ReactNode;
  iconFill?: React.ReactNode;
}

const HeaderNavLink = ({ href, title, version, icon, iconFill }: HeaderProps) => {
  const pathname = usePathname().split('/')[1].replace(/\//g, '');
  const basePath = href.replace(/\//g, '');
  const isPath = basePath === pathname;
  return (
    <div className={`${isPath ? 'pointer-events-none' : ''}`}>
      <Link href={href}>
        <div className={`group flex flex-row items-center font-[450] border-b-2 hover:border-neutral-400/40
                        ${isPath ? 'border-neutral-400/40' : 'border-transparent'}`}>
          {iconFill ? (
            <span className="grid">
              <span className="col-start-1 row-start-1 z-10 text-light_accent">{icon}</span>
              <span className={`col-start-1 row-start-1 z-0 transition-colors
                              ${isPath ? 'text-primary-100' : 'text-primary-200'}`}>{iconFill}</span>
            </span>
          ) : icon}
          <p className="pl-1">{title} <span className="text-neutral-500 font-regular">{version}</span></p>
        </div>
      </Link>
    </div>
  );
}

export default HeaderNavLink;