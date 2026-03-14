import CenteredGrid from "../../components/CenteredGrid";

export default function NotimerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CenteredGrid>{children}</CenteredGrid>;
}
