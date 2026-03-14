import { notFound } from "next/navigation";
import { posts } from "../../../components/changeblog/posts";
import ReconstructV07 from "../../../components/changeblog/postContent/ReconstructV07";
import ReconstructV06 from "../../../components/changeblog/postContent/ReconstructV06";
import ReconstructV05 from "../../../components/changeblog/postContent/ReconstructV05";
import ReconstructV04 from "../../../components/changeblog/postContent/ReconstructV04";

const postComponents: Record<string, React.ComponentType> = {
  "reconstruct-v0-7": ReconstructV07,
  "reconstruct-v0-6": ReconstructV06,
  "reconstruct-v0-5": ReconstructV05,
  "reconstruct-v0-4": ReconstructV04,
};

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
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
