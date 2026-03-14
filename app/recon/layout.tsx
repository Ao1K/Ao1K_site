import CenteredGrid from "../../components/CenteredGrid";
import ReconSkeleton from "../../components/recon/ReconSkeleton";

export default function ReconLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CenteredGrid fallback={<ReconSkeleton />}>{children}</CenteredGrid>;
}
