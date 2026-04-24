import Link from "next/link";
import { lessons } from "../../components/learn/lessons";

export default function Learn() {
  const categories: Record<string, typeof lessons> = {};
  for (const lesson of lessons) {
    (categories[lesson.category] ??= []).push(lesson);
  }

  return (
    <div className="flex flex-col pt-20 pb-10 px-6 max-w-3xl text-md text-primary-100 leading-relaxed">
      <h1 className="text-3xl text-primary-300">Learn</h1>
      <div className="bg-primary-100 w-full h-1 mb-8" />

      {Object.entries(categories).map(([category, catLessons]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl text-primary-300 font-medium mb-3">{category}</h2>
          <ul className="flex flex-col gap-2">
            {catLessons.map((lesson) => (
              <li key={lesson.slug}>
                <Link
                  href={`/learn/${lesson.slug}`}
                  className="block py-2 px-3 rounded bg-primary-800 hover:bg-primary-700 text-primary-100 transition-colors"
                >
                  {lesson.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
