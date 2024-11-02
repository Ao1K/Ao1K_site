import React from "react";

import "./globals.css";

import Header from "../components/Header";
import Footer from "../components/Footer";

import type { Metadata } from "next";
import { Rubik } from "next/font/google";

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
      <html lang="en" className={`min-h-full flex flex-col ${rubik.variable} font-san`}>
        
        
        <body
          className={`w-full min-h-screen pt-16 grid grid-cols-[1fr,5fr,1fr] md:grid-cols-[1fr,4fr,1fr] lg:grid-cols-[1fr,3fr,1fr] xl:grid-cols-[2fr,3fr,2fr] overflow-auto bg-dark`}
        >
          <Header />
          
          <div id="left-margin" className="block bg-dark h-full"></div> 
          
          <main className="col-start-2 flex flex-col bg-dark">
            {children}
          </main>
          
          <div id="right-margin" className="block bg-dark h-full"></div> 
          
          <Footer/>
        </body>
      </html>
    </>
  );
}

