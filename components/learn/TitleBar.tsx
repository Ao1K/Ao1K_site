import LessonTitle from "./LessonTitle";
import LessonAudience from "./LessonAudience";

export default function TitleBar({
  title,
  subtitle,
  seconds,
}: {
  title: string;
  subtitle?: string;
  seconds?: number;
}) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between mb-8 gap-2">
      <div className="place-items-start shrink-0">
        <LessonTitle title={title} subtitle={subtitle} />
      </div>
      {seconds && (
      <div className="text-left md:text-right">
        <LessonAudience seconds={seconds} />
      </div>
      )}
    </div>
  );
}
