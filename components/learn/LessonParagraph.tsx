export default function LessonParagraph({
  paragraph,
}: {
  paragraph: string;
}) {
  return (
    <p className="text-base text-primary-700 sm:text-lg">
      {paragraph}
    </p>
  );
}