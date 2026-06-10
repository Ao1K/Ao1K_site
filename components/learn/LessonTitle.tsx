export default function LessonTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 className="text-3xl font-medium tracking-tight text-primary-200 sm:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <p className="text-base text-neutral-400 sm:text-lg mt-2">{subtitle}</p>
      )}
    </div>
  );
}