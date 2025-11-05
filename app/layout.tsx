import React from "react";

import "./globals.css";

import Header from "../components/Header";

import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import Footer from "../components/Footer";

import { Amplify } from 'aws-amplify';
import outputs from "../amplify_outputs.json"

Amplify.configure(outputs);

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-Rubik',
});

export const metadata: Metadata = {
  title: "Ao1K – Reconstruction",
  description: "Statisically significant speedcube analysis",
  icons: {
    icon: "/Ao1K Logo - Icon.png",
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
          className={`min-h-screen pt-16 grid overflow-auto bg-primary-900 
            grid-cols-[0,minmax(0,8fr),0] 
            md:grid-cols-[1fr,minmax(0,5fr),1fr] 
            lg:grid-cols-[1fr,minmax(0,3fr),1fr] 
            xl:grid-cols-[3fr,minmax(0,4fr),3fr] `}
          >
          <Header />
          
          <div id="left-margin" className="block bg-primary-900 h-full grid-lines-50-l -z-10"></div> 
          
          <main className="col-start-2 flex flex-col bg-primary-900">
            {children}
            <Footer />
          </main>
          
          <div id="right-margin" className="block bg-primary-900 h-full grid-lines-50-r -z-10"></div> 

          
        </body>
      </html>
    </>
  );
}

