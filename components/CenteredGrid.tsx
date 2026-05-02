import React from "react";
import Footer from "./Footer";

export default function CenteredGrid({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-row bg-primary-900">
      <div className="mr-5 flex-1 grid-lines-50-l" />
      <main className="w-full max-w-xl flex flex-col bg-primary-900 main-content">
        <React.Suspense fallback={fallback ?? null}>
          {children}
          <Footer />
        </React.Suspense>
      </main>
      <div className="ml-5 flex-1 grid-lines-50-r" />
    </div>
  );
}
