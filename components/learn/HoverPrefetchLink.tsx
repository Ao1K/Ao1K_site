"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";

type HoverPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "prefetch" | "onMouseEnter" | "onTouchStart">;

export default function HoverPrefetchLink(props: HoverPrefetchLinkProps) {
  const [intentShown, setIntentShown] = useState(false);
  const showIntent = () => setIntentShown(true);

  return (
    <Link
      {...props}
      prefetch={intentShown ? null : false}
      onMouseEnter={showIntent}
      onTouchStart={showIntent}
    />
  );
}
