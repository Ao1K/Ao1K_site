import React from "react";

import "./globals.css";

import Header from "../components/Header";
import Footer from "../components/Footer";

import type { Metadata } from "next";
import { Rubik } from "next/font/google";



import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';

Amplify.configure(outputs);



const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-Rubik',
});

export const metadata: Metadata = {
  title: "Ao1K – Reconstruction",
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
          className={`min-h-screen pt-16 grid overflow-auto bg-dark
            grid-cols-[1fr,minmax(0,6fr),1fr] 
            md:grid-cols-[1fr,minmax(0,4fr),1fr] 
            lg:grid-cols-[1fr,minmax(0,3fr),1fr] 
            xl:grid-cols-[2fr,minmax(0,2fr),2fr] `}
        >
          <Header />
          
          <div id="left-margin" className="block bg-dark h-full -z-10"></div> 
          
          <main className="col-start-2 flex flex-col bg-dark">
            {children}
          </main>
          
          <div id="right-margin" className="block bg-dark h-full -z-10"></div> 
          
          <Footer/>
        </body>
      </html>
    </>
  );
}

