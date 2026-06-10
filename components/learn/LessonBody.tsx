export default function LessonBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="
      [&_p]:mb-4 [&_p]:text-base [&_p]:leading-8 [&_p]:text-primary-200 sm:[&_p]:text-md [&_p]:tracking-[0.1]
      [&_h1]:scroll-mt-24 [&_h1]:mt-12 [&_h1]:mb-4 [&_h1]:border-b [&_h1]:border-neutral-600 [&_h1]:pb-1
      [&_h1]:text-xl [&_h1]:font-medium [&_h1]:tracking-tight [&_h1]:text-primary-400 sm:[&_h1]:text-2xl
      [&_h2]:scroll-mt-24 [&_h2]:mt-3 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:tracking-tight [&_h2]:text-dark_accent sm:[&_h2]:text-xl
      [&_code]:inline-block [&_code]:rounded-sm [&_code]:bg-primary-700
      [&_code]:px-0.75 [&_code]:pt-1 [&_code]:pb-0.75  [&_code]:font-mono [&_code]:text-[1.02em] [&_code]:mx-0.5
      [&_code]:leading-none [&_code]:text-primary-100
      [&_a]:hover:text-neutral-300 [&_a]:underline [&_a]:underline-offset-2
      
      "
    >
      {children}
    </div>
  );
}