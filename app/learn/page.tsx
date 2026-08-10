import type { Metadata } from "next";
import Link from "next/link";
import LessonBody from "../../components/learn/LessonBody";
import { lessons } from "../../components/learn/lessons";
import TitleBar from "../../components/learn/TitleBar";

export const metadata: Metadata = {
  title: "Ao1K – Lesson",
  description: "Learn to cube",
};

export default function Learn() {
  const categories: Record<string, typeof lessons> = {};
  for (const lesson of lessons) {
    (categories[lesson.category] ??= []).push(lesson);
  }

  return (
    <div className="flex flex-col pt-20 pb-10 px-6 max-w-3xl mx-auto text-md text-primary-100 leading-relaxed">
      <TitleBar title="Cubing Lessons" subtitle="And the adventures of Peaku" />
      <div className="bg-primary-100 w-full h-0.5 mb-8" />
      <LessonBody>
        <p>{"Below is an incomplete list of lessons for cubing, told through the eyes of a young adventurer, Peaku."}</p>
        <p>{"There is much evil in Peaku's world. The world opened up one day and swallowed his sister. She is not dead. Her presence still beats beside his own heart. What is there to do but find out who took her, claw her back from the dirt?"}</p>
        <p>{"Let us begin."}</p>
        {Object.entries(categories).map(([category, catLessons]) => (
          <div key={category} className="my-8">
            <h2 className="text-xl text-primary-300 font-medium mb-3">{category}</h2>
            <ul className="grid grid-cols-2 content-start gap-2">
              {catLessons.map((lesson) => (
                <li key={lesson.slug}>
                  <Link
                    href={`/learn/${lesson.slug}`}
                    className="underline-offset-2 underline py-2 px-3 rounded hover:bg-primary-800 text-primary-100 transition-colors"
                  >
                    {lesson.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </LessonBody>
    </div>
  );
}
