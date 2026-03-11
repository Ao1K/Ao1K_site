import React from "react";

import "./globals.css";

import Header from "../components/Header";

import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import Footer from "../components/Footer";
import ReconSkeleton from "../components/recon/ReconSkeleton";

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
    <>
      <html lang="en" className={`min-h-full flex flex-col ${rubik.variable} font-san`}>
        
        
        <body
          className={`min-h-screen pt-16 grid overflow-auto bg-primary-900 
            grid-cols-[0,minmax(0,8fr),0] 
            md:grid-cols-[1fr,minmax(0,5fr),1fr] 
            lg:grid-cols-[1fr,minmax(0,4fr),1fr] 
            xl:grid-cols-[4fr,minmax(0,5fr),4fr] `}
          >
          <Header />
          
          <div id="left-margin" className="block bg-primary-900 h-full grid-lines-50-l -z-10"></div> 
          
          <main className="col-start-2 flex flex-col mx-0 sm:mx-10 bg-primary-900 main-content">
            <React.Suspense fallback={<ReconSkeleton />}>
              {children}
              <Footer />
            </React.Suspense>
          </main>
          
          <div id="right-margin" className="block bg-primary-900 h-full grid-lines-50-r -z-10"></div> 

          
        </body>
      </html>
    </>
  );
}

