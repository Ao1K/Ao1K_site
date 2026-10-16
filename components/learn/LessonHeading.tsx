export function toHeadingSlug(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

export function H1({ children }: { children: string }) {
  return <h1 id={toHeadingSlug(children)}>{children}</h1>;
}

export function H2({ children }: { children: string }) {
  return <h2 id={toHeadingSlug(children)}>{children}</h2>;
}
