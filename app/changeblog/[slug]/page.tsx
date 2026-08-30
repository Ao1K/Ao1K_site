import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogCategory, posts, type Post } from "../../../components/changeblog/posts";
import AlgsV01 from "../../../components/changeblog/postContent/AlgsV01";
import ReconstructV09 from "../../../components/changeblog/postContent/ReconstructV09";
import ReconstructV08 from "../../../components/changeblog/postContent/ReconstructV08";
import ReconstructV07 from "../../../components/changeblog/postContent/ReconstructV07";
import ReconstructV06 from "../../../components/changeblog/postContent/ReconstructV06";
import ReconstructV05 from "../../../components/changeblog/postContent/ReconstructV05";
import ReconstructV04 from "../../../components/changeblog/postContent/ReconstructV04";
import Blog_1 from "../../../components/changeblog/postContent/Blog_1";

const postComponents: Record<string, React.ComponentType> = {
  "algs-v0-1": AlgsV01,
  "reconstruct-v0-9": ReconstructV09,
  "reconstruct-v0-8": ReconstructV08,
  "reconstruct-v0-7": ReconstructV07,
  "reconstruct-v0-6": ReconstructV06,
  "reconstruct-v0-5": ReconstructV05,
  "reconstruct-v0-4": ReconstructV04,
  "not-another-timer": Blog_1,
};

function describePost(post: Post | undefined) {
  if (!post) return "Changes to Ao1K";
  if (post.category === blogCategory) return post.lead ?? `Blogpost`;
  return `Changes in ${post.title}`;
}

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  return {
    title: post?.title ?? "Changeblog",
    description: describePost(post),
  };
}

export default async function ChangelogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const Component = postComponents[slug];

  if (!Component) notFound();

  return (
    <div className="flex flex-col pt-20 pb-10 px-6 max-w-3xl text-md text-primary-100 leading-relaxed">
      <Component />
    </div>
  );
}
