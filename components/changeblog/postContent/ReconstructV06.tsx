"use client";

import Image from "next/image";
import Link from "next/link";
import SettingsIcon from "../../icons/settings";

export default function ReconstructV06() {
  return (
    <>
      <div className="flex flex-row gap-2 ">
        <h1 className="text-3xl text-primary-300">Reconstruct v0.6</h1>
        <div className="h-fit self-end pb-[2px] text-neutral-400">Jan 18th, 2026</div>
      </div>
      <div className="bg-primary-100 w-full h-1"></div>
      
      <div className="pt-6">
        Here we are in this little flutter of complexity. 
        We don&apos;t know what came before, or what comes after. 
        But today there is version 0.6 of the Reconstruct tool.
        <ul className="pt-6 space-y-1 list-none text-neutral-400">
          <li>- Removed spacebar requirement</li>
          <li>- Added setting to change the color scheme of the cube</li>
          <li>- Added about 700 F2L algs</li>
          <li>- Website loads twice as fast</li>
          <li>- Alg suggestion improvements</li>
        </ul>
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Auto Text Substitutions</h2>
      <div className="flex flex-col gap-6">
        This update should be called the Teri Update. 
        As a result of a conversation we had, you can now do the following:
        <ul className="space-y-1 list-none text-neutral-400">
          <li>- Typing &quot;UD&quot; and pressing space creates &quot;(U D) &quot;</li>
          <li>- Typing two moves like &quot;RF&quot; creates &quot;R F&quot;</li>
          <li>- Typing a wide move like &quot;Uw&quot; creates &quot;u&quot;</li>
          <li>- Typing repeated moves like &quot;RR&quot; creates &quot;R2&quot;</li>
        </ul>
        <div>I lied about the whole &quot;not needing spacebar&quot; thing.</div>
        <div>The (U D) substitution is great for conveying you did both moves at the same time.
          The other substitutions I view mostly as an autocorrect, but you can use them heavily if you wish.
        </div>
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} More F2L algs</h2>
      <div className="flex flex-col gap-6">
        Another Teri talk yielded more algs. 
        She noted how a lot of algs on the site do not have their &quot;y2&quot; form.
        For example, applying &quot;y2&quot; to R U R&apos; gives L U L&apos;.
        So I updated my scripting to apply y2 to all F2L algs that have just {`<`}RU{`>`} and {`<`}LU{`>`} moves.
        This added about 700 new algs, but honestly I lost count and I can&apos;t be asked to check.
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Colorblind Support</h2>
      <div className="flex flex-col gap-6">
        A conversation with someone with colorblindness helped remind me that colorblind people exist.
        <div className="flex flex-row gap-3 items-center"><SettingsIcon className="min-w-8 ml-3 min-h-8 text-primary"/>
          Find this button at the top of the page to change the cube colors.
        </div>
        <div className="flex flex-col">
          You might enjoy playing around with this feature even if you&apos;re not colorblind.
          But don&apos;t. The colors on the site are perfect how they are, thank you very much.
        </div>
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Page go zoom</h2>
      <div className="flex flex-col gap-6">
        I threw a bunch of optimizations at the wall to see what stuck.
        Mostly this meant trying to make the server (Amazon Web Services) render as much of the site as possible ahead of time, rather than your browser having to do it.
        The end result is that the Recon page loads in about half the time when you first open it.
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Better suggestions</h2>
      <div className="flex flex-col gap-6 pb-6">
        As a result of the work done for Reconstruct v0.4, I was able to improve the algorithm suggestion system a bit.
        You now will get less awful suggestions. For example, if get the suggestion &quot;R U R&apos;&quot; now, 
        you won&apos;t also get the suggestion &quot;R U R&apos; L U L&apos;&quot; for no reason.
        <div>
          I basically run a check to see if shorter versions of the alg will solve the same pieces.
          The work also loosely supports the possibility of multislot suggestions in the future, which you might see today occasionally if you&apos;re lucky.
        </div>
        <Image
          src="/changeblog/multislotSuggestionExample.png"
          alt="Multislot suggestion example"
          width={294}
          height={441}
          className="rounded-md border border-neutral-700"
        />
        <div>Live free my friend.</div>
      </div>
    </>
  );
}
