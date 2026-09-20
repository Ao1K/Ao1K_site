import { SVGProps } from 'react';

export default function Grip(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" {...props}>
      <g fill="currentColor">
        <circle cx="92" cy="60" r="18" />
        <circle cx="164" cy="60" r="18" />
        <circle cx="92" cy="128" r="18" />
        <circle cx="164" cy="128" r="18" />
        <circle cx="92" cy="196" r="18" />
        <circle cx="164" cy="196" r="18" />
      </g>
    </svg>
  );
}
