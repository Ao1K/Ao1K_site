function getAudienceColor(seconds: number): string {
  // red (sub-10) → green (sub-60+)
  const t = Math.max(0, Math.min(1, (seconds - 10) / 50));
  const r = Math.round(239 + t * (34 - 239));
  const g = Math.round(68 + t * (197 - 68));
  const b = Math.round(68 + t * (94 - 68));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function LessonAudience({ seconds }: { seconds: number }) {
  const color = getAudienceColor(seconds);

  return (
    <details className="inline-block relative open:max-md:flex open:max-md:flex-row open:max-md:items-start h-7.5">
      <summary className="cursor-pointer list-none shrink-0">
        <span className="pr-1.5" style={{ color, borderColor: color }}>Audience</span>
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-sm font-medium select-none"
          style={{ color, borderColor: color }}
        >
          Sub-{seconds}
        </span>
      </summary>
      <p className="max-md:ml-3 md:absolute md:mt-2 md:right-0 text-sm text-neutral-300 md:whitespace-nowrap">
        Intended for cubers who average {seconds} seconds or faster.
      </p>
    </details>
  );
}
