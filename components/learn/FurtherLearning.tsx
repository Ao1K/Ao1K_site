export interface Source {
  id: string;
  title: string;
  href: string;
  attribution?: string;
}

export function Citation<S extends Source>({
  sources,
  id,
}: {
  sources: readonly S[];
  id: S["id"];
}) {
  const sourceNumber = sources.findIndex((source) => source.id === id) + 1;

  return (
    <sup className="">
      <a href={`#source-${id}`} className="text-dark_accent font-bold no-underline! hover:text-primary-100">
        {sourceNumber}
      </a>
    </sup>
  );
}

export default function FurtherLearning({ sources }: { sources: readonly Source[] }) {
  return (
    <section>
      <h1>Further learning</h1>
      <ol className="list-decimal list-inside space-y-2 mb-4 rounded-sm bg-dark_accent px-4 py-3 text-base text-primary-900 sm:text-md">
        {sources.map((source) => (
          <li key={source.id} id={`source-${source.id}`} className="scroll-mt-24">
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-light_accent hover:text-primary-600!"
            >
              {source.title}
            </a>
            {source.attribution && <span className="text-primary-700">{` ${source.attribution}`}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
