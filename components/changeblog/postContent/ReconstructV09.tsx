import PhGear, { PhGearFill } from "../../icons/settings";
import Image from "next/image"
import Link from "next/link";

const ALGSET_ROWS = [
  { category: "CFOP", options: ["F2L", "OLL", "PLL"], selected: ["F2L", "OLL", "PLL"] },
  { category: "ZB", options: ["ZBLS", "ZBLL"], selected: ["ZBLL"] },
];

function DummyCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex w-4 h-4 shrink-0 items-center justify-center rounded-xs border border-neutral-600 ${
        checked ? "bg-neutral-700" : "bg-primary-100"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="w-3 h-3 text-primary-100" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="3,8 6.5,12 13,4" />
        </svg>
      )}
    </span>
  );
}

function DummySettingsMenu() {
  return (
    <div className="flex w-fit flex-col items-end" aria-hidden="true">
      <div className="flex flex-row justify-end items-center w-full h-16 pr-2 bg-primary-200 text-light_accent">
        <div className="flex items-center justify-center p-1 w-12 h-12 relative">
          <PhGear className="text-light_accent w-8 h-8 absolute z-10" />
          <PhGearFill className="text-primary-100 w-8 h-8 absolute z-0" />
        </div>
      </div>

      <div className="bg-primary-100 border border-primary-300 rounded-sm shadow-lg min-w-62.5">
        <div className="px-3 py-2 border-b border-primary-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-light_accent">Show Player Controls</span>
            <DummyCheckbox checked />
          </div>
        </div>

        <div className="px-3 py-2 border-b border-primary-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-light_accent">Show Splits</span>
            <DummyCheckbox checked={false} />
          </div>
        </div>

        <div className="px-3 py-2 border-b border-primary-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-light_accent">Handedness</span>
            <div className="flex rounded-sm overflow-hidden border border-primary-300">
              <div className="px-3 py-1 text-xs font-semibold bg-neutral-100 text-dark">Lefty</div>
              <div className="px-3 py-1 text-xs font-semibold bg-primary-700 text-primary-100">Righty</div>
            </div>
          </div>
        </div>

        <div className="px-3 py-2">
          <span className="text-sm font-semibold text-light_accent">Algsets</span>
          <div className="grid grid-cols-[auto_1fr] gap-x-0 gap-y-2 mt-2">
            {ALGSET_ROWS.map(({ category, options, selected }) => (
              <div key={category} className="contents">
                <div className="flex items-center gap-2 rounded-l-sm border border-primary-300 bg-primary-200/40 px-3 py-2">
                  <DummyCheckbox checked={options.every((o) => selected.includes(o))} />
                  <span className="text-xs font-semibold text-primary-600">{category}</span>
                </div>
                <div className="flex flex-row flex-wrap items-center gap-3 rounded-r-sm border border-l-0 border-primary-300 bg-primary-200/40 px-3 py-2">
                  {options.map((option) => (
                    <div key={option} className="flex items-center gap-1">
                      <DummyCheckbox checked={selected.includes(option)} />
                      <span className="text-xs text-primary-600">{option}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ReconstructV09() {
  return (
    <>
      <div className="flex flex-row gap-2 ">
        <h1 className="text-3xl text-primary-300">Reconstruct v0.9</h1>
        <div className="h-fit self-end pb-0.5 text-neutral-400">Aug 7th, 2026</div>
      </div>
      <div className="bg-primary-100 w-full h-1"></div>
      <div className="pt-6 gap-1 flex flex-col">
        <p>
          As I walk up the valley, I yearn for the incomprehensible. But what I find is version 0.9 of the Reconstruct tool.
        </p>
        <ul className="pt-6 space-y-1 list-none text-neutral-400">
          <li>- Added ZBLS and ZBLL alg suggestions</li>
          <li>- Added setting for preferring lefty algs over righty</li>
          <li>- Added alg favoriting. Remember to make backups!</li>
        </ul>
      </div>
      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Many, many algs</h2>
      <div className="flex flex-col gap-6 pb-6">
        <p>Can't count all these algs! We now have a full set of ZBLL and ZBLS algs, as well as hundreds more for F2L, OLL, and PLL.</p>
        <p>ZBLL and ZBLS algorithm suggestions are off by default. Enable them in the settings.</p>
        <DummySettingsMenu />
        <p>You may notice there's now a setting for "Handedness" as well. If you prefer algorithms that use R moves, then you won't have to do anything. But otherwise, change it to lefty and algorithm suggestions will favor algorithms with L moves.</p>
        <p>This setting gives a slight preference to F2L or ZBLS algs of the given handedness, and a much larger preference to last layer algs.</p>
      </div>

      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Ur my fav</h2>
      <div className="flex flex-col gap-6 pb-6">
        <p>You can now favorite algorithms! Click the parrot! Ka-CAW!</p>
        <Image
          src="/changeblog/favoriteSuggestionExample.png"
          alt="Fav an alg"
          width={575}
          height={186}
          className="rounded-md border border-neutral-700"
        />
        <p>Favoriting a last layer alg will place it at the top of the autocomplete list next time you get that case. It also adds it to Your Algs. See the <Link className="underline underline-offset-1" href="/changeblog/algs-v0-1/">changeblog post</Link> about the Algs tool for more info.</p>
        <p>Important note! Favorites are saved to your browser. If you clear your cookies, your favorites will go away. However, you can import and export backups via the <Link className="underline underline-offset-1" href="/algs">Algs page</Link>.</p>
        <p>Go to sleep my friend. You need your energy.</p>
      </div>
    </>
  );
}
