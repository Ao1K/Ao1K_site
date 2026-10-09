import PhInfo from "../icons/info";

export default function LessonStory({
  storyParagraphs,
}: {
  storyParagraphs: React.ReactNode[];
}) {
  return (
    <div className="space-y-4 bg-green-800 text-dark py-4 px-6 text-sm italic mb-4 rounded-sm">
      <div className="flex items-center gap-3 not-italic">
        <details className="peer shrink-0">
          <summary className="flex items-center gap-1 text-green-200 hover:text-green-100 transition-colors cursor-pointer list-none">
            <PhInfo />
            <span className="text-sm font-medium tracking-wide">Story</span>
          </summary>
        </details>
        <span className="invisible peer-open:visible text-sm text-green-200">
          The stories are here to make it easier to understand and remember the lessons.
        </span>
      </div>
      {storyParagraphs.map((paragraph, index) => (
        <p key={index} className="text-green-100!">{paragraph}</p>
      ))}
    </div>
  );
}