import LearnSidebar from "../../components/learn/LessonSidebar";

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-center w-full min-h-[calc(100vh-4rem)]">
      <div className="flex flex-row w-full max-w-7xl">
        <LearnSidebar />
        <div className="flex-1 min-w-0 flex flex-col">{children}</div>
      </div>
    </div>
  );
}
