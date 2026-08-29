import { posts } from "../posts";

export default function LeadParagraph({ slug }: { slug: string }) {
  const lead = posts.find((post) => post.slug === slug)?.lead;

  if (!lead) return null;

  return <p className="pt-6">{lead}</p>;
}
