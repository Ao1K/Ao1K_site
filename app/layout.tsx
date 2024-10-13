import { Rubik } from "next/font/google";
import React from "react";
import "./globals.css";
import Header from "../components/Header";
import type { Metadata } from "next";
import Footer from "../components/Footer";

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-Rubik',
});

export const metadata: Metadata = {
  title: "Ao1K",
  description: "Statisically significant speedcube analysis",
  icons: {
    icon: "../Ao1K Logo - Icon.png",
  },
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
    <html lang="en" className="min-h-full">
      <body className={`w-full min-h-screen flex flex-col bg-dark overflow-auto ${rubik.variable} font-sans`}>
        <Header/>
        <div className="flex-grow bg-dark pt-16">
          {children}
        </div>
        <Footer/>
      </body>
    </html>
    </>
  );
}
