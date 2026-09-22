import LessonTitle from "./LessonTitle";
import LessonAudience, { type Audience } from "./LessonAudience";

export default function TitleBar({
  title,
  subtitle,
  audience,
}: {
  title: string;
  subtitle?: string;
  audience?: Audience;
}) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between mb-8 gap-2">
      <div className="place-items-start shrink-0">
        <LessonTitle title={title} subtitle={subtitle} />
      </div>
      {audience !== undefined && (
      <div className="text-left md:text-right">
        <LessonAudience audience={audience} />
      </div>
      )}
    </div>
  );
}
