export type Post = {
  slug: string;
  title: string;
  date: string;
  category: string;
  lead?: string;
};

export const blogCategory = "Regular blog";

export const posts: Post[] = [
  {
    slug: "algs-v0-1",
    title: "Algs v0.1",
    date: "Aug 7th, 2026",
    category: "Algs",
  },
  {
    slug: "reconstruct-v0-9",
    title: "Reconstruct v0.9",
    date: "Aug 7th, 2026",
    category: "Reconstruct",
  },
  {
    slug: "reconstruct-v0-8",
    title: "Reconstruct v0.8",
    date: "May 16th, 2026",
    category: "Reconstruct",
  },
  {
    slug: "reconstruct-v0-7",
    title: "Reconstruct v0.7",
    date: "Mar 13th, 2026",
    category: "Reconstruct",
  },
  {
    slug: "reconstruct-v0-6",
    title: "Reconstruct v0.6",
    date: "Jan 18th, 2026",
    category: "Reconstruct",
  },
  {
    slug: "reconstruct-v0-5",
    title: "Reconstruct v0.5",
    date: "Dec 31st, 2025",
    category: "Reconstruct",
  },
  {
    slug: "reconstruct-v0-4",
    title: "Reconstruct v0.4",
    date: "Nov 25th, 2025",
    category: "Reconstruct",
  },
  {
    slug: "not-another-timer",
    title: "Not another timer",
    date: "Aug 28th, 2026",
    category: blogCategory,
    lead: "Your idea for a website is probably very cool. I mean that earnestly. I have no reason to think otherwise. I don't know you.",
  },
];

const latestChangelogPost = posts.find((post) => post.category !== blogCategory);

export const latestSlug = latestChangelogPost?.slug ?? posts[0].slug;
