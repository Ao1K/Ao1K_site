"use client";

import Link from "next/link";
import { StepIconsExample2_1, StepIconsExample2_2, StepIconsExample2_4, StepIconsExample2_6, StepIconsExample2_7 } from "../StepIconsExample2";

export default function ReconstructV07() {
  return (
    <>
      <div className="flex flex-row gap-2 ">
        <h1 className="text-3xl text-primary-300">Reconstruct v0.7</h1>
        <div className="h-fit self-end pb-[2px] text-neutral-400">Mar 13th, 2026</div>
      </div>
      <div className="bg-primary-100 w-full h-1"></div>
      
      <div className="pt-6">
        There is. And that&apos;s all we know.
        <ul className="pt-6 space-y-1 list-none text-neutral-400">
          <li>- Added Roux, ZZ, and Petrus icons</li>
          <li>- Made F2L and PLL icons better-er</li>
          <li>- Made icons bigger</li>
          <li>- Made some other sweet UI changes</li>
        </ul>
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Many methods</h2>
      <div className="flex flex-row gap-6 my-6 md:my-0">
        <div className="flex md:flex-row flex-col md:gap-6">
          <div className="w-[80px] h-[80px] my-6">
            <StepIconsExample2_2 />
          </div>
          <div className="w-[80px] h-[80px] md:my-6">
            <StepIconsExample2_6 />
          </div>
        </div>
          Blocks larger than 1x1x2 are now recognized as a valid step.
          This means Roux and Petrus solves will be much more visual.
      </div>
      <div className="flex flex-row gap-6 pb-6">
        <div className="py-6">
          <StepIconsExample2_4 />
        </div>
        <div>
          The LSE (Last Six Edges) step for Roux will show as a complete view
          of the top and front faces of the cube. The icon format
          went through a lot of iterations and discussion, and this generally seemed to have a favorable opinion.
          The number of stickers present is the main reason that icons are now bigger by default.
        </div>
      </div>
      <div className="pb-12 pl-[104px]">
          This LSE concept was heavily inspired by <Link className="underline underline-offset-1" href="https://enbyne.tech/tools/laser">https://enbyne.tech/tools/laser</Link>,
          a Roux trainer for LSE.
          Many thanks to the creator of this site.
      </div>
      <div className="flex flex-row gap-6 pb-6">
        <div className="shrink-0">
          <StepIconsExample2_7 />
        </div>
        <div>
          EO (Edge Orientation) is now recognized as step.
          Any line of text in your solution that solves EO will mean there will be a magenta border around the icon,
          unless that line also solves the whole cube.
          The EO color is configurable in the settings.
        </div>
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Do you believe in CFOP? In a young girl&apos;s heart?</h2>
      <div className="flex flex-row gap-6">
        <div className="w-[80px] h-[80px]">
          <StepIconsExample2_1 />
        </div>
        <div className="flex gap-6 pb-6">
          F2L icons now have a notch taken out of them. 
          This essentially means that they &quot;point&quot; in the direction of the slot that they solve, when viewing the cube from the top.
          For this icon, the pair is being solved front right.
        </div>
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} I&apos;m Tired Boss</h2>
      <div className="flex gap-6 pb-6">
        The other changes in this update aren&apos;t worth mentioning as they&apos;re readily apparent or just bug fixes. Enjoy the site!
      </div>
    </>
  );
}
