/**
 * 
 * @returns A beautiful skeleton
 */
export default function ReconSkeleton() {
  return (
    <main className="col-start-2 col-span-1 flex flex-col bg-primary-900 mt-[52px]">
      {/* top bar */}
      <div className="px-3 flex flex-row flex-wrap items-center place-content-end gap-2 mt-8 mb-3">
        {/* title input skeleton - matches TitleInput layout */}
        <div className="flex flex-grow flex-nowrap items-center min-w-[200px]">
          <div className="text-dark_accent text-xl font-medium select-none">Title</div>
          <div className="p-2 ml-4 w-full h-[46px] bg-primary-800 border border-neutral-600 rounded-sm animate-pulse" />
        </div>
        {/* top buttons skeleton */}
        <div className="flex-none flex flex-row space-x-1 pr-2">
          <div className="w-10 h-10 bg-primary-800 rounded animate-pulse" />
          <div className="w-10 h-10 bg-primary-800 rounded animate-pulse" />
          <div className="w-10 h-10 bg-primary-800 rounded animate-pulse" />
        </div>
      </div>

      {/* scramble area */}
      <div className="px-3 mt-3 flex flex-col">
        <div className="text-xl text-dark_accent font-medium">Scramble</div>
        <div className="lg:max-h-[15.1rem] max-h-[10rem] min-h-[4.7rem] bg-primary-800 border border-neutral-600 rounded animate-pulse" />
      </div>

      {/* player box / cube area */}
      <div className="px-3 relative flex flex-col mt-6 w-full justify-center items-center">
        <div className="flex h-full aspect-video max-h-96 min-h-[200px] bg-black border border-neutral-600 rounded-t-sm w-full justify-center items-center">
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
        <div className="border border-neutral-600 h-[6px] rounded-b-sm w-full bg-primary-700 mb-2" />
      </div>

      {/* solution area */}
      <div className="px-3 mt-1 mb-6 flex flex-col w-full">
        <div className="text-xl text-dark_accent font-medium">Solution</div>
        <div className="lg:max-h-[20rem] max-h-[10rem] min-h-[4.7rem] ml-[28px] mb-[24px] bg-primary-800 border border-neutral-600 rounded animate-pulse" />
      </div>

      {/* time area */}
      <div className="px-3 flex flex-col w-full">
        <div className="text-xl text-dark_accent font-medium">Time</div>
        <div className="flex flex-row flex-wrap items-center gap-2 pb-16">
          <div className="border border-neutral-600 flex flex-row items-center">
            <div className="pt-2 pb-2 px-2 w-[84px] h-[44px] bg-primary-900 animate-pulse" />
            <div className="text-primary-100 pr-2 text-xl">sec</div>
          </div>
          <div className="text-primary-100 ml-2 text-xl">0 stm</div>
          <div className="text-primary-100 text-xl">(-- tps)</div>
        </div>
      </div>
    </main>
  );
}
