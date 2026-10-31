import type { ReactNode } from "react";
import LessonNavigator from "../../../components/learn/LessonNavigator";
import Footer from "../../../components/Footer";

export default function LearnLessonLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 min-w-0 justify-center gap-8 xl:gap-10">
      <div className="flex flex-1 min-w-0 flex-col items-center">
        <div className="flex flex-1 w-full justify-center">{children}</div>
        <Footer />
      </div>
      <div className="hidden xl:block w-64 shrink-0">
        <LessonNavigator />
      </div>
    </div>
  );
}
