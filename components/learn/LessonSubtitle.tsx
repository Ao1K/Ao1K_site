export default function LessonSubtitle({
  subtitle,
}: {
  subtitle: string;
}) {
  return (
    <h2 className="text-xl font-semibold tracking-tight text-primary-700 sm:text-2xl">
      {subtitle}
    </h2>
  );
}