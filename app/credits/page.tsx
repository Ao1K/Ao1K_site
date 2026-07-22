import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ao1K – Credits",
  description: "Credits for algs on this site.",
};

const credits = [
  {
    name: "Brina Sun and Masadl",
    contribution: "ZBLS algs",
    source: "https://docs.google.com/spreadsheets/d/1q07bhdQigqXbzNSvW6g8uBDaEDlcGS-PB14aH4c9NiM/edit?usp=sharing",
  },
  {
    name: "Chad Batten and Tao Yu",
    contribution: "ZBLS algs",
    source: "https://docs.google.com/spreadsheets/d/1s8Q2VM2c1eV3oLIxFfM4exvABO0AcCeMCUdMiYKnzC0/edit?usp=sharing",
  },
  {
    name: "Aladdin",
    contribution: "ZBLS algs",
    source: null,
  },
  {
    name:"Caden Grey",
    contribution: "F2L algs",
    source: "https://docs.google.com/spreadsheets/d/1K3VMtTnEc_f5-3I_yaCiMUDONR9cqEb-S_jE10wouFs/edit?usp=sharing"
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
        <p className="mb-4">{"In no particular order:"}</p>
        <ul className="flex flex-col gap-2">
          {credits.map((credit) => (
            <li key={credit.name}>
              {credit.name}
              {" for "}
              {credit.source ? (
                <a
                  href={credit.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-primary-300"
                >
                  {credit.contribution}
                </a>
              ) : (
                credit.contribution
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
