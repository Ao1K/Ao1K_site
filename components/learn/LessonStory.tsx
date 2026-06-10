import PhInfo from "../icons/info";

export default function LessonStory({
  storyParagraphs,
}: {
  storyParagraphs: React.ReactNode[];
}) {
  return (
    <div className="space-y-4 bg-green-900 py-4 px-6 text-dark text-sm text-justify italic mb-4 rounded-sm">
      <div className="flex items-center gap-1 not-italic">
        <details className="flex items-center gap-1">
          <summary className="flex items-center gap-1 text-green-200 hover:text-green-100 transition-colors cursor-pointer list-none">
            <PhInfo />
            <span className="text-sm font-medium tracking-wide">Story</span>
          </summary>
          <span className="text-sm text-green-200 ml-1">
            The stories are here to make it easier to understand and remember the lessons.
          </span>
        </details>
      </div>
      {storyParagraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}