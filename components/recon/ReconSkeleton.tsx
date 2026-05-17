/**
 * 
 * @returns A beautiful skeleton
 */
export default function ReconSkeleton() {
  return (
    <main className="flex flex-col bg-primary-900 mt-10">
      {/* info dropdown + top buttons row */}
      <div className="px-3 flex flex-row items-center mt-4 mb-5">
        <div className="text-xl text-dark_accent underline underline-offset-2 font-medium flex flex-row items-center gap-1 select-none opacity-50">
          <div className="w-8 h-8 mr-2 bg-primary-700 rounded animate-pulse" />
          Info
          <div className="w-4 h-4 bg-primary-700 rounded animate-pulse" />
        </div>
        <div className="ml-auto flex-none flex flex-row space-x-1">
          <div className="w-10 h-8 bg-primary-800 rounded animate-pulse" />
          <div className="w-16 h-8 bg-primary-800 rounded animate-pulse" />
          <div className="w-20.5 h-8 bg-primary-800 rounded animate-pulse" />
        </div>
      </div>

      {/* title input */}
      <div className="px-3 flex grow flex-nowrap items-center min-w-50 mb-2">
        <div className="text-dark_accent text-xl font-medium select-none">Title</div>
        <div className="p-2 ml-4 w-full h-11.5 bg-primary-800 border border-neutral-600 rounded-sm animate-pulse" />
      </div>

      {/* scramble area */}
      <div className="px-3 mt-3 flex flex-col">
        <div className="text-xl text-dark_accent font-medium">Scramble</div>
        <div className="lg:max-h-[15.1rem] max-h-40 min-h-[4.7rem] bg-primary-800 border border-neutral-600 rounded animate-pulse" />
      </div>

      {/* player box / cube area */}
      <div className="px-3 relative flex flex-col mt-6 w-full justify-center items-center">
        <div className="flex h-full aspect-video max-h-96 min-h-50 bg-black border border-neutral-600 rounded-t-sm w-full justify-center items-center">
          <div className="text-xl text-primary-100 z-10">Loading cube...</div>
        </div>
      </div>

      {/* bottom bar / toolbar */}
      <div className="mx-3 relative flex flex-col justify-center items-center">
        <div className="border-x w-full border-neutral-600 h-14 flex items-center px-3 space-x-1">
          <div className="w-16 h-8 bg-primary-800 rounded animate-pulse" />
          <div className="flex-1 flex space-x-1 justify-start">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-10 h-8 bg-primary-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="border border-neutral-600 h-1.5 rounded-b-sm w-full bg-primary-700 mb-2" />
      </div>

      {/* solution area */}
      <div className="px-3 mt-1 flex flex-col w-full">
        <div className="text-xl text-dark_accent font-medium">Solution</div>
        <div className="lg:max-h-80 max-h-40 min-h-[4.7rem] ml-7 mb-6 bg-primary-800 border border-neutral-600 rounded animate-pulse" />
      </div>

      {/* time area */}
      <div className="px-3 flex flex-col w-full">
        <div className="text-xl text-dark_accent font-medium">Time</div>
        <div className="flex flex-row flex-wrap items-center gap-2 pb-16">
          <div className="border border-neutral-600 flex flex-row items-center">
            <div className="pt-2 pb-2 px-2 w-21 h-11 bg-primary-900 animate-pulse" />
            <div className="text-primary-100 pr-2 text-xl">sec</div>
          </div>
          <div className="text-primary-100 text-xl">0 stm</div>
          <div className="text-primary-100 text-xl">(-- tps)</div>
        </div>
      </div>
    </main>
  );
}
