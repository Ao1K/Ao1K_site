import type { ReactNode } from "react";
import LessonNavigator from "../../../components/learn/LessonNavigator";

export default function LearnLessonLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 min-w-0 justify-center gap-8 xl:gap-10">
      <div className="flex flex-1 min-w-0 justify-center">{children}</div>
      <LessonNavigator />
    </div>
  );
}