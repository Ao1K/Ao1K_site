import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credits",
  description: "Credits for algs on this site.",
};

const credits = [
  {
    name: "Brina Sun and Masadl",
    contribution: "ZBLS algs",
    source: "https://docs.google.com/spreadsheets/d/1q07bhdQigqXbzNSvW6g8uBDaEDlcGS-PB14aH4c9NiM/edit?usp=sharing",
    extraContrib: null,
  },
  {
    name: "Chad Batten and Tao Yu",
    contribution: "ZBLS algs",
    source: "https://docs.google.com/spreadsheets/d/1s8Q2VM2c1eV3oLIxFfM4exvABO0AcCeMCUdMiYKnzC0/edit?usp=sharing",
    extraContrib: null,
  },
  {
    name: "Aladdin",
    contribution: "ZBLS algs",
    source: null,
    extraContrib: null,
  },
  {
    name:"Caden Grey",
    contribution: "F2L algs",
    source: "https://docs.google.com/spreadsheets/d/1K3VMtTnEc_f5-3I_yaCiMUDONR9cqEb-S_jE10wouFs/edit?usp=sharing",
    extraContrib: null,
  },
  {
    name: "Wara",
    contribution: "being the coolest librarian, and for Sharknado, the bite-y-est cat around",
    source: null,
    extraContrib: null
  },
  {
    name:"Stewy",
    contribution: "OLL and PLL algs",
    source: "https://reco.nz/algs/oll",
    extraContrib: ", for early design commentary, and for Angus",
  },
  {
    name:"Juliette (JuJu) Sébastien and others",
    contribution: "ZBLL algs",
    source: "https://docs.google.com/spreadsheets/d/1-uwmZHf4vwJxFgeB3-TiF8MQ0RFSS30d5CUK96PoIwk",
    extraContrib: null,
  },
  {
    name:"Teri",
    contribution: "having opinions that hurt me",
    source: null,
    extraContrib: null,
  },
  {
    name:"and to my sister",
    contribution: "being there for me, and for telling me to put the scramble box above the cube visualizer, where the significance of both cannot be overstated easily.",
    source: null,
    extraContrib: null,
  }
];

export default function Credits() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-dark">
      <div className="flex flex-col pt-20 pb-16 px-6 max-w-3xl mx-auto text-md text-primary-100 leading-relaxed">
        <h1 className="text-2xl font-semibold text-dark_accent mb-8">Credits</h1>
        <p className="mb-4">
          {"Algs belong to the community. The discovery of algorithms is also very hard to credit."}
        </p>
        <p className="mb-16">
          {"However, the work of specific individuals made it easier to add algs to this site. Alg sheets I used are linked when available."}
        </p>
        <p className="mb-4">{"In no particular order, thank you to:"}</p>
        <ul className="flex flex-col gap-2 text-primary-300">
          {credits.map((credit) => (
            <li key={credit.name}>
              {credit.name}
              {" for "}
              {credit.source ? (
                <span>
                <a
                href={credit.source}
                target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-primary-300"
                >
                  {credit.contribution}
                </a>
                {credit.extraContrib}
                </span>
              ) : (
                credit.contribution
              )}
            </li>
          ))}
          <span className="text-primary-100">Thank you.</span>
        </ul>
      </div>
    </div>
  );
}
