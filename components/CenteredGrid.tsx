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
    <div
      className={`min-h-[calc(100vh-4rem)] grid
        grid-cols-[0,minmax(0,8fr),0]
        md:grid-cols-[1fr,minmax(0,5fr),1fr]
        lg:grid-cols-[1fr,minmax(0,4fr),1fr]
        xl:grid-cols-[4fr,minmax(0,5fr),4fr]`}
    >
      <div className="block bg-primary-900 h-full grid-lines-50-l -z-10" />

      <main className="col-start-2 flex flex-col mx-0 sm:mx-10 bg-primary-900 main-content">
        <React.Suspense fallback={fallback ?? null}>
          {children}
          <Footer />
        </React.Suspense>
      </main>

      <div className="block bg-primary-900 h-full grid-lines-50-r -z-10" />
    </div>
  );
}
