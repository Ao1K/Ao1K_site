export default function LessonTitle({
  title,
}: {
  title: string;
}) {
  return (
    <h1 className="text-3xl font-bold tracking-tight text-primary-900 sm:text-4xl">
      {title}
    </h1>
  );
}