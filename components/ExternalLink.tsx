import ArrowOutIcon from './icons/arrowOut';

export default function ExternalLink({
  href,
  text,
  className = '',
}: {
  href: string;
  text: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`underline underline-offset-2 ${className}`}
    >
      {text}
      <ArrowOutIcon
        width="1em"
        height="1em"
        className="inline-block ml-0.5 align-[-0.12em]"
        aria-hidden="true"
      />
    </a>
  );
}
