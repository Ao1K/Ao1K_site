import { notFound } from "next/navigation";
import { lessons } from "../../../components/learn/lessons";
import EO from "../../../components/learn/postContent/eo";

const lessonComponents: Record<string, React.ComponentType> = {
  eo: EO,
};

export function generateStaticParams() {
  return lessons.map((lesson) => ({ slug: lesson.slug }));
}

export default async function LearnLesson({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const Component = lessonComponents[slug];

  if (!Component) notFound();

  return (
    <div
      data-lesson-content
      className="flex w-full max-w-3xl flex-col pt-20 pb-10 px-6 text-md text-primary-100 leading-relaxed"
    >
      <Component />
    </div>
  );
}
