import { redirect } from "next/navigation";
import { latestSlug } from "../../components/changeblog/posts";

export default function Changeblog() {
  redirect(`/changeblog/${latestSlug}`);
}
