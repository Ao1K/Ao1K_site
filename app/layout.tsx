import React from "react";

import "./globals.css";

import Header from "../components/Header";
import SidebarAutoClose from "../components/SidebarAutoClose";
import HeaderNavLink from "../components/HeaderNavLink";
import WriteIcon from "../components/icons/write";
import BulletListIcon from "../components/icons/bulletList";

import type { Metadata } from "next";
import { Rubik } from "next/font/google";

import { Amplify } from 'aws-amplify';
import outputs from "../amplify_outputs.json"

Amplify.configure(outputs);

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-Rubik',
  display: 'swap',
  weight: ['400', '500', '700'],
  adjustFontFallback: true,
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: "Ao1K – Reconstruction",
  description: "Statisically significant speedcube analysis",
  icons: {
    icon: "/Ao1K-Logo-Icon.png",
  },
  openGraph: {
    title: "Ao1K – Reconstruction",
    description: "Statisically significant speedcube analysis",
    images: ['/api/og'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Ao1K – Reconstruction",
    description: "Statisically significant speedcube analysis",
    images: ['/api/og'],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`min-h-full flex flex-col ${rubik.variable} font-san`}>
      <body className="min-h-screen pt-16 overflow-auto bg-primary-900">
        {/* Checkbox state for mobile sidebar - must be first sibling for peer-checked to work */}
        <input type="checkbox" id="sidebar-toggle" className="peer sr-only" />
        <SidebarAutoClose />
        <Header />
        {/* Overlay backdrop - sibling of checkbox so z-index is not trapped by header's stacking context */}
        <label
          htmlFor="sidebar-toggle"
          className="hidden peer-checked:block fixed inset-0 bg-black bg-opacity-50 z-30 cursor-default"
          aria-label="Close sidebar"
        />
        {/* Sidebar dropdown - also a sibling of checkbox */}
        <div className="hidden peer-checked:flex sm:hidden flex-col text-dark bg-white space-y-4 absolute top-[60px] right-0 p-4 z-50 border border-primary-300 mt-1">
          <label htmlFor="sidebar-toggle" className="whitespace-nowrap cursor-pointer">
            <HeaderNavLink href="/recon" title="Reconstruct" icon={<WriteIcon />} version="v0.7" />
          </label>
          <label htmlFor="sidebar-toggle" className="whitespace-nowrap cursor-pointer">
            <HeaderNavLink href="/changeblog/" title="Changeblog" icon={<BulletListIcon />} version="" />
          </label>
        </div>
        {children}
      </body>
    </html>
  );
}

