import type { ReactNode } from "react";
import LessonNavigator from "../../../components/learn/LessonNavigator";
import Footer from "../../../components/Footer";
import { lessons } from "../../../components/learn/lessons";

export default async function LearnLessonLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lessonSlug = lessons.find((lesson) => lesson.slug === slug)?.slug;

  return (
    <div className="flex flex-1 min-w-0 justify-center gap-8 xl:gap-10">
      <div className="flex flex-1 min-w-0 flex-col items-center">
        <div className="flex flex-1 w-full justify-center">{children}</div>
        <Footer lessonSlug={lessonSlug} />
      </div>
      <div className="hidden xl:block w-64 shrink-0">
        <LessonNavigator />
      </div>
    </div>
  );
}
