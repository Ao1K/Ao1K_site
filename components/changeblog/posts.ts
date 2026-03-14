export type Post = {
  slug: string;
  title: string;
  date: string;
  category: string;
};

export const posts: Post[] = [
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
];

export const latestSlug = posts[0].slug;
