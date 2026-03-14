import ChangelogSidebar from "../../components/changeblog/ChangelogSidebar";
import Footer from "../../components/Footer";

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-center w-full min-h-[calc(100vh-4rem)]">
      <div className="flex flex-row w-full max-w-5xl">
        <ChangelogSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
