"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import MovesTextEditor from "../../components/recon/MovesTextEditor";
import StepIcons from "../../components/changeblog/StepIconsExample";
import CubeGraphic from "../../components/changeblog/CubeGraphic";
import type { PNGVisualizerOptions } from "sr-puzzlegen";
import QuestionIcon from "../../components/icons/info";

type PlaceholderMoveHistory = {
  history: string[][];
  index: number;
  status: string;
  MAX_HISTORY: number;
  undo_redo_done?: boolean;
};



export default function Changeblog() {
  const placeholderMoveHistory = useRef<PlaceholderMoveHistory>({
    history: [["", ""]],
    index: 0,
    status: "ready",
    MAX_HISTORY: 1,
    undo_redo_done: true,
  });

  const [editorHTML, setEditorHTML] = useState<string>("<div>R U R' U' // this is a comment <br></div><div>R U R' U' / this is not<br></div><div>R U R' U' \\\\ you need to be banned</div>");
  const [editorHTML2, setEditorHTML2] = useState<string>("R2 M F 🏃‍♂️🛹🤘 S R r B // xcross + a sweet kickflip");

  const handleTrackMoves = () => {};
  const handleUpdateHistory = () => {};

  const customMask: PNGVisualizerOptions = {
    puzzle: {
      mask: {
      U: [0,1,2,3,4,5,6,8],
      R: [0,1,2,3,4,5,6,7,8],
      F: [0,2,3,4,5,6,7,8],
      D: [0,1,2,3,4,5,6,7,8],
      L: [0,1,2,3,4,5,6,7,8],
      B: [0,1,2,3,4,5,6,7,8],
      }
    }
  }


  return (
    <div className="flex flex-col pt-20 pb-10 px-6 max-w-3xl text-lg text-primary-100">
      <div className="flex flex-row gap-2 ">
        <h1 className="text-3xl text-primary-300">Reconstruct v0.4</h1>
        <div className="h-fit self-end pb-[2px] text-neutral-400">Nov 25th, 2025</div>
      </div>
      <div className="bg-primary-100 w-full h-1"></div>
      
      <div className="pt-6">
        Hello. Here&apos;s what new in version 0.4 of the Reconstruct tool:
        <ul className="pt-6 space-y-1 list-none text-neutral-400">
          <li>- Made //comments redundant</li>
          <li>- Added screenshot tool</li>
          <li>- Added autocomplete</li>
          <li>- Added cat</li>
        </ul>

        <div className="text-dark flex flex-row gap-3 py-1 pr-3 mt-6 w-2/3 items-center bg-neutral-300">
          <QuestionIcon className="min-w-8 ml-3 min-h-8 text-light_accent"/>
          <div>This post assumes you know a little about cubing, reconstructions, and the CFOP method.
          </div>
        </div>
      </div>



      <h2 className="py-2 text-xl mt-24 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} No more ugly comments</h2>
      <div className="flex flex-col gap-6">
        If you&apos;re not familiar with comments in this context, consider yourself blessed.
        <MovesTextEditor
          name="1"
          trackMoves={handleTrackMoves}
          autofocus={false}
          moveHistory={placeholderMoveHistory}
          updateHistoryBtns={handleUpdateHistory}
          html={editorHTML}
          setHTML={setEditorHTML}
        />
      </div>
      <div className="flex flex-col gap-6 pt-6">
        You use comments to describe a line of text. Comments are fine, but they&apos;re not beautiful. 
        They take extra time to type. And usually, they&apos;re unnecessary. CFOP solves all tend to follow the same pattern,
        so the only time they&apos;re nice is when something unintuitive happened.
        <MovesTextEditor
          name="2"
          trackMoves={handleTrackMoves}
          autofocus={false}
          moveHistory={placeholderMoveHistory}
          updateHistoryBtns={handleUpdateHistory}
          html={editorHTML2}
          setHTML={setEditorHTML2}
        />
      </div>
      <div className="flex flex-row gap-4 min-w-[50px] py-6">
        <StepIcons />
        <div className="flex flex-col h-full align-middle">
          <p className="pt-1">
            To encourage people not to type comments, 
            and to make recons easier to understand at a glance, 
            I&apos;ve designed dynamic icons that come before each line of text.
          </p>
          <p className="pt-6">
            The icons should make sense enough, so I&apos;m not going to talk about them. But they do come in handy with the new Screenshot feature.
          </p>
        </div>
      </div>



      <h2 className="py-2 text-xl mt-24 pl-2 w-full text-dark bg-primary-300">{`>`} Screenshots, beautiful screenshots</h2>
      <p className="pt-6">
        Solves are visual. To efficiently communicate the information, recons should be too. Most people just post the text when they share recons. 
        You could make a video or post to a recon website, but that makes everything take longer.
      </p>
      <p className="pt-6">
        Introducing Screenshots. They&apos;re not actually screenshots. But they are pretty!
      </p>
      <div className="py-6 max-w-[400px]">
        <Image
          src="/changeblog/screenshotExample.png"
          alt="Screenshot example"
          width={300}
          height={300}
          className="rounded-md border border-neutral-700"
        />
      </div>
      <div className="flex flex-col gap-6 pt-6">
        You can take a screenshot by going to the top of the Reconstruct page and clicking here:
      </div>
      <div className="py-6 max-w-[200px]">
        <Image
          src="/changeblog/screenshotHowTo.png"
          alt="How to screenshot"
          width={200}
          height={200}
          className="rounded-md border border-neutral-700"
        />
      </div>



      <h2 className="py-2 text-xl mt-24 pl-2 w-full text-dark bg-primary-300">{`>`} Autocomplete</h2>
      <h3 className="w-1/2 pl-4 text-lg bg-neutral-300 text-dark">{`>>`} The feature</h3>
      <p className="pt-6">
        The last major feature in this release is autocomplete. Using it is simple.
        Type in a solution to cross, press enter, and suggestions will start to generate.
        Currently, there&apos;s algorithm suggestions for F2L, OLL, and PLL.
      </p>
      <div className="py-6 max-w-[400px]">
        <Image
          src="/changeblog/autocompleteExample.png"
          alt="Autocomplete example"
          width={300}
          height={300}
          className="rounded-md border border-neutral-700"
        />
      </div>

      <h3 className="w-1/2 mt-24 pl-4 text-lg bg-neutral-300 text-dark">{`>>`} Enormous amounts of pain</h3>
      <p className="pt-6">
        Simple to use, very difficult for me to write the code for. 
        If you&apos;re interested, I want to talk about some of what went into writing it.
        Then, I&apos;ll talk about how it works.
      </p>
      <p className="pt-6">The first half of v0.4 development mostly consisted of the following:</p>
      <ul className="pt-6 space-y-1 list-none text-neutral-400">
        <li>- Spending hours writing my thoughts down</li>
        <li>- Spending hours staring at my Rubik&apos;s cubes, or off into space</li>
        <li>- Reworking the core logic several times</li>
        <li>- Avoiding crying</li>
      </ul>
      <p className="pt-6">
        ...point being that perseverance is important sometimes.
        Eventually I made a key observation.
      </p>
      <div className="flex flex-row">
        <div className="w-64 h-64 mx-auto my-8">
          <CubeGraphic alg="R U R' U'"/>
        </div>      
        <div className="w-64 h-64 mx-auto my-8">
          <CubeGraphic alg="y R U R' U'"/>
        </div>
      </div>
      <p className="pt-6">
        These are the same cubes.
      </p>
      <p className="pt-6">
        They&apos;re solved the same. A human who knows the CFOP method immediately knows how to solve both cases,
        even though the colors are different. It&apos;s about the pattern of the colors, 
        not the colors themselves.
      </p>
      <p className="pt-6">
        If we could convert the colors into standard pattern format, we&apos;d be in business.
        We could compare the pattern of the current state of the cube
        against the pattern that an algorithm solves.
      </p>
      <p className="pt-6">
        I chose to represent the pattern as 26 letters, one letter for each piece of the cube. 
        For example, here&apos;s a pattern:
      </p>
      <div className="mt-6 p-4 w-fit bg-neutral-900 rounded-md border border-neutral-700 overflow-x-auto font-mono text-sm text-neutral-300">
        <pre>
{`"abcdefghijklehkbnqtwabcdef"`}
        </pre>
      </div>
      <p className="pt-6">
        It&apos;s not gibberish. If we programmatically check all the pieces and get this pattern, it means the cube is solved!
      </p>

      <h3 className="w-1/2 pl-4 mt-24 text-lg bg-neutral-300 text-dark">{`>>`} Calculating the pattern</h3>


      <p className="pt-6">
        How do we know what&apos;s an "a" and what&apos;s a "q"? It&apos;s complicated. 
        I don&apos;t expect this to make sense right away, 
        but I think it&apos;s good to outline first what we need to do:
      </p>
      <div>
        <ol className="pt-6 space-y-1 list-decimal list-inside text-neutral-400">
          <li>Get the current rotation of the cube</li>
          <li>Transform the colors of the current cube to "effective" colors, based on the rotation</li>
          <li>Take each effective piece and get its location</li>
          <li>Represent that location as a letter</li>
          <li>Join all the letters together</li>
        </ol>
      </div>
      <p className="pt-6">
        Now for an example. Let&apos;s take a look at those cubes again.
      </p>
      <div className="flex flex-row">
        <div className="w-64 h-64 mx-auto my-8">
          <CubeGraphic alg="R U R' U'"/>
        </div>      
        <div className="w-64 h-64 mx-auto my-8">
          <CubeGraphic alg="y R U R' U'"/>
        </div>
      </div> 

      
      <div>
        <ol className="pt-6 space-y-1 list-decimal list-inside text-neutral-400">
          <li>Get the current rotation of the cube</li>
        </ol>
      </div>
      <p className="pt-6">
        We&apos;ll say for simplicity that the cube on the left is at rotation 0.
        This means the cube on the right is at rotation y (90 degrees clockwise about the vertical axis).
      </p>


      <div>
        <ol className="pt-6 space-y-1 list-decimal list-inside text-neutral-400">
            <li value={2}>Transform the colors of the current cube to "effective" colors, based on the rotation</li>
        </ol>
      </div>
      <p className="pt-6">
        To normalize the colors on the right cube, we essentially need to "rotate" the colors as well.
        Yellow stays yellow--the top center color didn&apos;t change despite the rotation.
        The front center color is green, but it needs to be red. Orange needs to be green, 
        blue needs to be orange, and so on.
      </p>
      <p className="pt-6">
       Now the cubes actually look the same to the computer:
      </p>
      <div className="flex flex-row">
        <div className="w-64 h-64 mx-auto my-8">
          <CubeGraphic alg="R U R' U'"/>
        </div>      
        <div className="w-64 h-64 mx-auto my-8">
          <CubeGraphic alg="R U R' U'"/>
        </div>
      </div> 


      <div>
        <ol className="pt-6 space-y-1 list-decimal list-inside text-neutral-400">
            <li value={3}>Take each effective piece and get its location</li>
        </ol>
      </div>
      <p className="pt-6">
        We look at each piece one by one, starting with a predetermined piece of certain actual colors.
        Let&apos;s pretend the first piece we always look at is the yellow-green piece.
        Using our color mapping, we look for the yellow-red piece instead:
      </p>
      <div className="w-64 h-64 mx-auto my-8">
        <CubeGraphic alg="R U R' U'" customMask={customMask}/>
      </div>
      <p className="pt-6">
        It&apos;s between the Up and Front centers! That was easy, it didn&apos;t move.
      </p>
      <p className="pt-6">
        It also didn&apos;t change orientation. If it did,
        we&apos;d say it&apos;s between the Front and Up centers, in that order.
        We predetermine one sticker to be "primary" to make that work.
      </p>


      <div>
        <ol className="pt-6 space-y-1 list-decimal list-inside text-neutral-400">
            <li value={4}>Represent that location as a letter</li>
        </ol>
      </div>
      <p className="pt-6">
        In the code, there&apos;s simply a table where we can look up 
        the value of the Up-Front (UF) location.
      </p>
      <div className="mt-6 p-4 bg-neutral-900 rounded-md border border-neutral-700 overflow-x-auto font-mono text-sm text-neutral-300">
        <pre>
{`  private readonly edgePieceDirections: { [key: string]: number} = {
    `}<span className="text-dark bg-yellow-300 font-bold">'UF': 0,</span>{` 'UR': 1, 'UB': 2, 'UL': 3, 
    'DF': 4, 'DR': 5, 'DB': 6, 'DL': 7, 
    'FR': 8, 'FL': 9, 'BR': 10, 'BL': 11,
    'FU': 12, 'RU': 13, 'BU': 14, 'LU': 15,
    'FD': 16, 'RD': 17, 'BD': 18, 'LD': 19,
    'RF': 20, 'LF': 21, 'RB': 22, 'LB': 23
  };`}
        </pre>
      </div>
      <p className="pt-6">
        So the value associated with 'UF' is 0. The 0th letter of the programmer alphabet is "a", 
        so that&apos;s the first letter of our pattern.
      </p>
      <div className="mt-6 p-4 bg-neutral-900 rounded-md border border-neutral-700 overflow-x-auto font-mono text-sm text-neutral-300">
        <pre>
{`currentCubePattern = "a..."`}
        </pre>
      </div>

      <div>
        <ol className="pt-6 space-y-1 list-decimal list-inside text-neutral-400">
            <li value={5}>Join all the letters together</li>
        </ol>
      </div>
      <p className="pt-6">
        We follow this procedure for every piece. 
        The corners are a bit different, but let&apos;s move on. 
        Draw the rest of the owl, as they say. 
      </p>
      <div className="mt-6 p-4 bg-neutral-900 rounded-md border border-neutral-700 overflow-x-auto font-mono text-sm text-neutral-300">
        <pre>
{`currentCubePattern = "acidefghbjklmkgbfqtwabcdef"`}
        </pre>
      </div>


      <h3 className="w-1/2 pl-4 mt-24 text-lg bg-neutral-300 text-dark">{`>>`} Actually autocompleting</h3>
      <p className="pt-6">
        Now we have a pattern of the current cube. 
        Computed in advance, we also have the patterns for all of our cubing algorithms.
        These were made by applying the inverse of the algorithm to a solved cube,
        then calculating the pattern like normal.
        In our case, the algorithm we need to solve the cube is "U R U&apos; R&apos;".
        We applied the inverse, "R U R&apos; U&apos;", to a solved cube and calculated this pattern:
      </p>
      <div className="mt-6 p-4 bg-neutral-900 rounded-md border border-neutral-700 overflow-x-auto font-mono text-sm text-neutral-300">
        <pre>
{`inverseAlgPattern = "acidefghbjklmkgbfqtwabcdef"`}
        </pre>
      </div>
      <p className="pt-6">
        It&apos;s the same pattern as currentCubePattern. 
        Since the patterns match, we know that the algorithm solves the cube!
        Job done, right? Owl drawn! Not quite. 
      </p>
      <p className="pt-6">
        Most times, the patterns won&apos;t match exactly.
        Only letters at certain positions will. The trick is just checking that the correct letters match.
        We need a list of letters that must be in certain positions
        for an algorithm to be a valid choice. 
      </p>
      <p className="pt-6">
        To exemplify this better, let&apos;s look at a more complex cube state, 
        but one that would benefit from having the same algorithm applied:
      </p>
      <div className="w-64 h-64 mx-auto my-8">
        <CubeGraphic alg="x2 y' B F2 D' U' L2 U' R2 F2 D' F2 U F2 B R B F' L2 D' B' F x2 F' R D' F R U' L U2 L' F' U F R U R' U' B U B' L' B L B' U2 R' U' R  R U R' U "/>
      </div>
      <p className="pt-6">
        The pattern for this cube is:
      </p>
      <div className="mt-6 flex p-4 bg-neutral-900 rounded-md border border-neutral-700 overflow-x-auto font-mono text-sm text-neutral-300">
        <pre className="">
{`complexCubePattern = "mclvefghbpkuuhmkfpbwabcdef"`}
        </pre>
      </div>
      <p className="pt-6">
        We still want the alg "U R U&apos; R&apos;" here to solve the white-orange-green corner and orange-green edge.
      </p>
      <p className="pt-6">
        This cube also has a couple pieces solved in the back. Let&apos;s look at those quick:
      </p>
      <div className="w-64 h-64 mx-auto my-8">
        <CubeGraphic alg="x2 y' B F2 D' U' L2 U' R2 F2 D' F2 U F2 B R B F' L2 D' B' F x2 F' R D' F R U' L U2 L' F' U F R U R' U' B U B' L' B L B' U2 R' U' R  R U R' U y x"/>
      </div>
      <p className="pt-6">
        So the algorithm must:
      </p>
      <div>
        <ul className="pt-6 space-y-1 list-item list-inside text-neutral-400">
            <li>A. Keep the white-orange-blue corner and orange-blue edge solved</li>
            <li>B. Solve the white-orange-green corner and orange-green edge</li>
            <li>C. Keep the four white edge pieces (cross) solved.</li>
        </ul>
      </div>
      <p className="pt-6">
        this gives us the pieces that must be in a certain location for the algorithm to be valid for our case.
        these indices are easy to get a hold of. for example,
        if cross is on the bottom face, the cross indices are always 4, 5, 6, and 7.
        let&apos;s also get the current location of the pieces using the complexCubePattern from a minute ago.
        The indices tell us directly which letters to grab. 
        If we look at the 4th indice, we grab the 4th letter, counting from zero.
      </p>
      <div className="my-6 overflow-x-auto border border-neutral-700 rounded-md">
        <table className="w-full text-sm text-center text-neutral-400">
          <thead className="text-xs text-neutral-200 uppercase bg-neutral-800">
            <tr>
              <th className="px-3 py-2 border-r border-neutral-700">Piece Index</th>
              <th className="px-3 py-2 border-r border-neutral-700">4</th>
              <th className="px-3 py-2 border-r border-neutral-700">5</th>
              <th className="px-3 py-2 border-r border-neutral-700">6</th>
              <th className="px-3 py-2 border-r border-neutral-700">7</th>
              <th className="px-3 py-2 border-r border-neutral-700">8</th>
              <th className="px-3 py-2 border-r border-neutral-700">10</th>
              <th className="px-3 py-2 border-r border-neutral-700">16</th>
              <th className="px-3 py-2">19</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-neutral-900">
              <td className="px-3 py-2 font-medium text-neutral-200 border-r border-neutral-700">Current location:</td>
              <td className="px-3 py-2 border-r border-neutral-700">e</td>
              <td className="px-3 py-2 border-r border-neutral-700">f</td>
              <td className="px-3 py-2 border-r border-neutral-700">g</td>
              <td className="px-3 py-2 border-r border-neutral-700">h</td>
              <td className="px-3 py-2 border-r border-neutral-700">b</td>
              <td className="px-3 py-2 border-r border-neutral-700">k</td>
              <td className="px-3 py-2 border-r border-neutral-700">f</td>
              <td className="px-3 py-2">w</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="pt-6">
        Let&apos;s highlight those indices in our algorithm pattern:
      </p>
      <div className="my-6 flex p-4 bg-neutral-900 rounded-md border border-neutral-700 overflow-x-auto font-mono text-sm text-neutral-300">
        <pre className="">
{`inverseAlgPattern = "acid`}
<span className="text-dark bg-yellow-300 font-bold">efghb</span>
{`j`}
<span className="text-dark bg-yellow-300 font-bold">k</span>
{`lmkgb`}
<span className="text-dark bg-yellow-300 font-bold">f</span>
{`qt`}
<span className="text-dark bg-yellow-300 font-bold">w</span>
{`abcdef"`}
        </pre>
      </div>
      <p className="pt-6">
        Then compare the letters of complexCubePattern and inverseAlgPattern at those indices:
      </p>

      <div className="my-6 overflow-x-auto border border-neutral-700 rounded-md">
        <table className="w-full text-sm text-center text-neutral-400">
          <thead className="text-xs text-neutral-200 uppercase bg-neutral-800">
            <tr>
              <th className="px-3 py-2 border-r border-neutral-700">Piece Index</th>
              <th className="px-3 py-2 border-r border-neutral-700">4</th>
              <th className="px-3 py-2 border-r border-neutral-700">5</th>
              <th className="px-3 py-2 border-r border-neutral-700">6</th>
              <th className="px-3 py-2 border-r border-neutral-700">7</th>
              <th className="px-3 py-2 border-r border-neutral-700">8</th>
              <th className="px-3 py-2 border-r border-neutral-700">10</th>
              <th className="px-3 py-2 border-r border-neutral-700">16</th>
              <th className="px-3 py-2">19</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-neutral-900">
              <td className="px-3 py-2 font-medium text-neutral-200 border-r border-neutral-700">Current location:</td>
              <td className="px-3 py-2 border-r border-neutral-700">e</td>
              <td className="px-3 py-2 border-r border-neutral-700">f</td>
              <td className="px-3 py-2 border-r border-neutral-700">g</td>
              <td className="px-3 py-2 border-r border-neutral-700">h</td>
              <td className="px-3 py-2 border-r border-neutral-700">b</td>
              <td className="px-3 py-2 border-r border-neutral-700">k</td>
              <td className="px-3 py-2 border-r border-neutral-700">f</td>
              <td className="px-3 py-2">w</td>
            </tr>
          </tbody>
          <tbody>
            <tr className="bg-neutral-900">
              <td className="px-3 py-2 font-medium text-neutral-200 border-r border-neutral-700">Alg Location:</td>
              <td className="px-3 py-2 border-r border-neutral-700">e</td>
              <td className="px-3 py-2 border-r border-neutral-700">f</td>
              <td className="px-3 py-2 border-r border-neutral-700">g</td>
              <td className="px-3 py-2 border-r border-neutral-700">h</td>
              <td className="px-3 py-2 border-r border-neutral-700">b</td>
              <td className="px-3 py-2 border-r border-neutral-700">k</td>
              <td className="px-3 py-2 border-r border-neutral-700">f</td>
              <td className="px-3 py-2">w</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="pt-6">
        They all match! We&apos;re good to suggest the algorithm this pattern is associated with, "U R U&apos; R&apos;".
        We go on to search over the other F2L inverse alg patterns in the same way
        and build out a list of suggestions.
      </p>
      <p className="pt-6">
        Again, we&apos;re drawing the rest of the owl. We check other F2L pairs for algs. Or OLL or PLL, depending on how much of the cube is solved.
        It&apos;s complicated! 
      </p>
      <p className="pt-6"> 
        The logic for OLL and PLL alg suggestions is actually very different. 
        With OLL and PLL, we no longer solve pieces to a precise location,
        so the pattern needs to be more flexible. If you&apos;re curious, feel free to look at the source code on Github. 
        Link is at the bottom of the page.
      </p>
      <p className="pt-6"> 
        While you&apos;re down there, go join the Discord. 
        At time of writing, the site has 2751 algs for the autocomplete, but it needs more! Please submit some.
      </p>




      <h2 className="py-2 text-xl mt-24 pl-2 w-full text-dark bg-primary-300">{`>`} Cat</h2>
      <p className="pt-6">
        Thanks for reading! Say hello to my friend&apos;s cat, Sharknado.
      </p>
      <div className="py-6 max-w-[400px]">
        <Image
          src="/cats/sharkie.jpg"
          alt="Autocomplete example"
          width={300}
          height={300}
          className="rounded-md border border-neutral-700"
        />
      </div>
      <div className="mt-20 w-full h-1"></div>
    </div>
    );
  }