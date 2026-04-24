import LessonParagraph from "./LessonParagraph";

export default function LessonStory({
  storyParagraphs,
}: {
  storyParagraphs: string[];
}) {
  return (
    <div className="space-y-4 bg-secondary-50 text-dark">
      {storyParagraphs.map((paragraph, index) => (
        <LessonParagraph key={index} paragraph={paragraph} />
      ))}
    </div>
  );
}