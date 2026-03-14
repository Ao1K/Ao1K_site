import React from "react";

import "./globals.css";

import Header from "../components/Header";

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
        <Header />
        {children}
      </body>
    </html>
  );
}

