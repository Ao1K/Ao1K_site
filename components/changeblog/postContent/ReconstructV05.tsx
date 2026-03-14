"use client";

import Image from "next/image";

export default function ReconstructV05() {
  return (
    <>
      <div className="flex flex-row gap-2 ">
        <h1 className="text-3xl text-primary-300">Reconstruct v0.5</h1>
        <div className="h-fit self-end pb-[2px] text-neutral-400">Dec 31st, 2025</div>
      </div>
      <div className="bg-primary-100 w-full h-1"></div>
      
      <div className="pt-6">
        Happy new year. Here&apos;s what changed in version 0.5:
        <ul className="pt-6 space-y-1 list-none text-neutral-400">
          <li>- Created better link previews</li>
          <li>- Massively sped up icon and alg suggestion generation</li>
        </ul>
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Pretty previews</h2>
      <div className="flex flex-col gap-6">
        Posting a link on a messaging service like Discord will now generate a preview of the solve.
        This is a lot like the screenshot tool, just a different format.
        Some of you might find it easier to share a link compared to an image.
      </div>
      <Image
        src="/changeblog/previewExample.png"
        alt="Preview example"
        width={513}
        height={439}
        className="rounded-md border border-neutral-700 mt-6"
      />
      <div className="flex flex-col gap-6 pt-6">
        Pressing Ctrl+S or the Share button is the best way to copy for a preview, but just copying the URL also works.
      </div>
      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Gas, gas, gas</h2>
      <div className="flex flex-col gap-6">
        Autocomplete suggestions and icons now generate basically instantly.
        I did this by removing the bad code and adding the okay code.
        Before I was abusing a library called cubingjs to represent all the cube state.
        This is great for the 3D elements of the page, 
        but it&apos;s not well suited for the cube interpretation logic I&apos;m doing.
        I now can represent the cube using just a few arrays.
      </div>
      <div className="flex flex-col gap-6 pt-6 pb-6">
        Peace out girl scout.
      </div>
    </>
  );
}
