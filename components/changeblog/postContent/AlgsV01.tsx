import Link from "next/link";
import PlayIcon from "../../icons/play";
import CopyIcon from "../../icons/copy";
import DropdownIcon from "../../icons/dropdown";
import Parrot from "../../icons/parrot";
import DownloadIcon from "../../icons/download";
import UploadIcon from "../../icons/upload";
import Image from "next/image"
import QuestionIcon from "../../icons/info";

const iconButtonClass = "shrink-0 text-neutral-500 hover:text-neutral-200 focus-visible:outline-none";

function DummyF2lAlgCard() {
  return (
    <div className="group flex flex-col max-w-80 rounded-sm border transition-colors text-neutral-500 hover:text-neutral-200 bg-dark border-neutral-600 hover:border-neutral-500">
      <div className="flex flex-row items-center p-1 gap-1">
        <span className="flex shrink-0 items-center pr-1">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 shrink-0 border border-neutral-600"
            stroke="#52525b"
            strokeWidth="1"
            fill="none"
          >
            <polygon points="0,0 24,0 0,24" fill="#3EF600" />
            <polygon points="24,0 24,24 0,24" fill="#FF0000" />
            <rect x="0" y="16" width="8" height="8" fill="#161018" />
            <title>GR pair</title>
          </svg>
        </span>

        <span className="grow min-w-0 text-primary-100 tracking-wide wrap-break-word text-md">
          R&apos; U2 R U R&apos; U&apos; R
        </span>

        <span className="relative flex shrink-0 items-center">
          <span className={iconButtonClass}>
            <CopyIcon />
          </span>
        </span>

        <span className={iconButtonClass}>
          <Parrot />
        </span>

        <span className={iconButtonClass}>
          <PlayIcon />
        </span>

        <div className="iconButtonClass visible">
          <DropdownIcon className="text-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-neutral-600 group-hover:border-neutral-500 font-medium px-2 py-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium tracking-normal text-neutral-300" style={{ wordSpacing: "8px" }}>
            R&apos; U2 R
          </span>
          <span className="shrink-0 text-sm text-neutral-300">Make split pair</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium tracking-normal text-neutral-300" style={{ wordSpacing: "8px" }}>
            U R&apos; U&apos; R
          </span>
          <span className="shrink-0 text-sm text-neutral-300">Insert pair</span>
        </div>
      </div>
    </div>
  );
}

function DummyTransferMenu() {
  const itemClass = 'block w-full pl-9 pr-3 py-1.5 text-left text-sm text-primary-100';
  const categoryClass = 'flex items-center gap-2 px-3 text-sm tracking-wide text-dark_accent';

  return (
    <div className="flex w-fit flex-col items-end" aria-hidden="true">
      <div className="flex items-center gap-1.5 pl-2 pr-1.5 h-7.5 border rounded-sm bg-dark border-neutral-600 text-sm text-primary-100">
        <span className="whitespace-nowrap">Import/Export</span>
        <DropdownIcon />
      </div>
      <div className="min-w-45 rounded-sm border border-neutral-600 bg-dark shadow-lg">
        <div className={`${categoryClass} py-1.5`}>
          <UploadIcon className="w-4 h-4 shrink-0" />
          Import from
        </div>
        <div className={itemClass}>CSV</div>
        <div className={`${categoryClass} border-t border-neutral-600 pb-1.5 pt-2`}>
          <DownloadIcon className="w-4 h-4 shrink-0" />
          Export...
        </div>
        <div className="flex mx-3 mb-1.5 rounded-sm border border-neutral-600 overflow-hidden">
          <div className="flex-1 px-2 py-1 text-xs whitespace-nowrap bg-neutral-600 text-primary-100">
            All <span className="tabular-nums">12</span>
          </div>
          <div className="flex-1 px-2 py-1 text-xs whitespace-nowrap text-primary-100">
            Filtered <span className="tabular-nums">3</span>
          </div>
        </div>
        <div className={`${categoryClass} pb-1.5`}>
          <span className="w-4 shrink-0" />
          as
        </div>
        <div className={itemClass}>CSV</div>
        <div className={itemClass}>PDF</div>
      </div>
    </div>
  );
}

export default function AlgsV01() {
  return (
    <>
      <div className="flex flex-row gap-2 ">
        <h1 className="text-3xl text-primary-300">Algs v0.1</h1>
        <div className="h-fit self-end pb-0.5 text-neutral-400">Aug 7th, 2026</div>
      </div>
      <div className="bg-primary-100 w-full h-1"></div>
      <div className="pt-6 gap-1 flex flex-col">
        <p>
          Simplicity is a virtue borne from life's complications. This is the first public release of the <Link className="underline underline-offset-1" href="/algs">Algs tool</Link>.
        </p>
        <ul className="pt-6 space-y-1 list-none text-neutral-400">
          <li>- Added a tool for finding and making sense of F2L solutions.</li>
          <li>- Added a place to store and track your algs. Remember to make backups!</li>
        </ul>
      </div>

      <div className="text-dark flex flex-row gap-3 py-1 pr-3 mt-6 w-2/3 items-center bg-neutral-300">
        <QuestionIcon className="min-w-8 ml-3 min-h-8 text-light_accent"/>
        <div>In this post, a "case" is some kind of placement of pieces on the cube. An "algorithm" or "solution" is a way of solving a given case.
        </div>
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Visual F2L</h2>
      <div className="flex flex-col gap-6 pb-6">
        <p>I made an tool to help people understand F2L because I feel there is a gap out there online. It can be hard to find the best solutions, and even if you do find good ones, it's easy to approach it incorrectly.</p>
        <p>Let me explain:</p>
      </div>
      <h3 className="w-1/2 pl-4 text-lg bg-neutral-300 text-dark">{`>>`} The problem</h3>
      <div className="flex flex-col gap-6 py-6">
        <p>There are a LOT of F2L cases. This site has over 3000 solutions for various cases. Even if you find ways to simplify, learning a bunch of these solutions by just memorizing them would waste a lot of time.</p>
        <p>So instead, F2L is taught intuitively. You learn a generalized process for solving things.
          This process can be slow because it is new to you and you're not used to recognizing anything. It's also nowhere near as efficient as it could be.</p>
        <p>So there's too many algorithms to just memorize, and the basic intuitive process is not enough. What do you do?</p>
      </div>
      <h3 className="w-1/2 pl-4 text-lg bg-neutral-300 text-dark">{`>>`} Understanding F2L</h3>
      <div className="flex flex-col gap-6 py-6">
        <p>Extremely good F2L still follows an intuitive process. 
          By understanding the F2L process better, you give yourself opportunities to improve your solutions to multiple cases. 
          For example, if you see a case where you can use R' U2 R to pair two pieces, you might be able to apply that idea to cases that look a bit different.</p>
        <DummyF2lAlgCard />
        <p>The Visual search tool will provide solutions like this one above. The full alg is written out up top. If you click on it, a dropdown will open up that shows how you can understand the alg.</p>
        <p>On the <Link className="underline underline-offset-1" href="/algs">actual page</Link>, clicking the play button will also slowly step through the solution move-by-move. Clicking the <span className="inline-flex align-middle text-neutral-500 text-2xl leading-none mx-1 -ml-0.5"><Parrot/></span>will add the alg to your list.</p>
      </div>

      <h3 className="w-1/2 pl-4 text-lg bg-neutral-300 text-dark">{`>>`} Exploring F2L solutions</h3>
      <div className="flex flex-col gap-6 py-6">
        <p>The number of cases makes a traditional list of all algorithms very unweildy for F2L. 
          The visual search tool here is very direct. You just click a few times, and you can set up a case in a couple seconds.</p>
      </div>
      <Image
        src="/changeblog/visualInputExample.png"
        alt="Visual F2L Search"
        width={472}
        height={541}
        className="rounded-md border border-neutral-700"
      />

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Alg list</h2>
      <p>You may have noticed some
        <span className="inline-flex align-middle text-dark_accent text-2xl leading-none mx-1 -ml-0.5"><Parrot/></span>
        icons around in places. These are favorite buttons. Clicking it will add it to your list on the Algs page.
      </p>
      <div className="flex flex-row gap-6">
        <div className="flex flex-col gap-6 pt-6">
          <p>Watch out! Algs are saved to your browser. If you clear your cookies, your algs will usually get cleared with them. Make CSV backups. You can import them back in later.</p>
        </div>
        <DummyTransferMenu />
      </div>
      <p className="pt-6">Thanks for reading. Live long, and more importantly, live well.</p>
    </>
  );
}
