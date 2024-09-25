'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface HeaderProps {
  href: string;
  title: string;
  icon: React.ReactNode;
}

const Header = ({ href, title, icon }: HeaderProps) => {

  const pathname = usePathname();
  const isPath = pathname === href;

  return (
    <Link href={href}>
      <div className={`flex flex-row items-center pb-2 mb-3
                      ${isPath ? 
                      'border-b-2 border-light_accent' : 
                      'hover:border-b-2 hover:border-dark_accent'}`}>
        {icon}
        <p className="pl-1">{title}</p>
      </div>
    </Link>
  );
}

export default Header;