import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";
import Story from "../LessonStory"
import ExternalLink from "../../ExternalLink"
import CubeImage from "../CubeImage"
import CubeScene from "../CubeScene"
import { H1, H2 } from "../LessonHeading"
import type { PieceName } from "../cubeProps"

const CENTERS: PieceName[] = ["W", "Y", "G", "R", "B", "O"];
const CROSS_PIECES: PieceName[] = [...CENTERS, "WB", "WG", "WO", "WR"];
const F2L_PIECES: PieceName[] = [...CROSS_PIECES, "BO", "BR", "GO", "GR", "WBO", "WBR", "WGO", "WGR"];
const OLL_GOAL_FACELETS = "YYYYYYYYYWWWWWWWWWXXXGGGGGGXXXOOOOOOXXXBBBBBBXXXRRRRRR";

export default function WhatToLearn() {
  return (
    <>
      <TitleBar title="What to Learn" subtitle="Getting started with CFOP" audience="all" />
      <LessonBody>
        <Story storyParagraphs={[
          `It is difficult to tell his father. His father blames him for the loss of his sister, says he should have been protecting her, throws things at the wall.`,
          `"I'll find her!" Peaku says.`,
          `"Alright then. Go."`,
          `Peaku doesn't move.`,
          `His father's face is red, tears collecting below his chin. "Go find Jera. Do not return until you do."`,
          `"How am I supposed to—?"`,
          `"Go. Go! How could you lose her?"`,
        ]} />
        <p>{`The world is a big place. It can be difficult to tell where to begin. But the important part is that you do.`}</p>
        <H1>{`Beginning`}</H1>
        <p>{`CFOP is a method for quickly solving a Rubik's cube. It is by far the most popular speedsolving method. Before learning CFOP, most people learn some variation of the "beginner's method". This is not a requirement, but it is generally considered to be a good idea.`}</p>
        <p>{`Here are some good options for learning beginner's method:`}</p>
        <ol className="list-inside list-decimal text-base text-neutral-400 leading-relaxed sm:text-md space-y-2 mb-4 pb-4">
          <li>
            <ExternalLink href="https://youtu.be/7Ron6MN45LY" text="Tutorial by J Perm" />
            {` (Simplest)`}
          </li>
          <li>
            <ExternalLink href="https://youtu.be/R-R0KrXvWbc" text="Tutorial by Wired magazine" />
            {` (Most similar to CFOP)`}
          </li>
          <li>
            <ExternalLink href="https://rubiks.com/solve-guide" text="Tutorial on Rubiks.com" />
            {` (Text-based)`}
          </li>
          <p>{`From now on, we will assume you want to learn CFOP.`}</p>
        </ol>
        <H1>CFOP Overview</H1>
        <p><b>CFOP</b>{` is an acronym. It stands for the components that make it up: `}</p>
        <div><b>C</b>ross</div>
        <div><b>F</b>2L,</div>
        <div><b>O</b>LL, and</div>
        <div className="mb-4"><b>P</b>LL </div>
        <p>{`You probably already know a basic approach to cross. The other steps will be substantially different, with the occasional concept that might look familiar.`}</p>
        <p>{`Let's go over each step. This will just be an overview. The next several lessons will go over how to actually learn these steps.`}</p>
        <H2>Cross</H2>
        <p>{`In the first step of CFOP, you solve four edge pieces into a cross or plus pattern.`}</p>
        <div className="flex flex-row flex-wrap pb-6 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Goal</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                labels
                scramble="z2"
                highlight={CROSS_PIECES}
                shade="#888888"
                className="w-full h-auto"
                dim={0.3}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="B' U2 R F2 U2 L' D2 L2 R D2 L2 U2 B2 F U2 B D R U2 F' z2"
                hints
                lines={[
                  { moves: ["R'", ["U'", "D'"], "L", "F", "R'", "D'"], durations: [1300, 1300, 1300, 1300, 1300, 1300], delay: 1400, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO"] }
                ]}
                loop
                progress
              />
            </div>
          </div>
        </div>
        <p>{`CFOP users will of course try to solve cross as fast as possible, which tends to mean doing it in as few moves as possible.`}</p>
        <p>{`This step is the most creative.`}</p>
        <H2>F2L</H2>
        <p>{`F2L is the second step, and it stands for First Two (2) Layers.`}</p>
        <p>{`In almost all beginner's method, you solve the first four corners, and then the second-layer edges. With F2L, you solve corner-edge pairs. This means you solve one corner and one edge at the same time, and you do this four times total.`}</p>
        <div className="flex flex-row flex-wrap pb-6 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Goal</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                hints
                labels
                scramble="z2 y'"
                highlight={F2L_PIECES}
                shade="#888888"
                className="w-full h-auto"
                dim={1}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="B' U2 R F2 U2 L' D2 L2 R D2 L2 U2 B2 F U2 B D R U2 F' z2 R' U' D' L F R' D'"
                hints
                lines={[
                  { moves: ["L", "U'", "L'", "R", "U2", "R'"], durations: [500, 500, 500, 500, 750, 500], delay: 800, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "GO", "WGO"] },
                  { moves: ["y", "R'", "U'", "R2", "U2", "R'"], durations: [500, 500, 500, 750, 750, 500], delay: 800, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "GO", "WGO", "BO", "WBO"] },
                  { moves: ["y", "U2", "R", "U2", "R'", "U2", "R", "U'", "R'"], durations: [500, 750, 500, 750, 500, 750, 500, 500, 500], delay: 800, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "GO", "WGO", "BO", "WBO", "BR", "WBR"] },
                  { moves: ["U'", "R'", "U", "R", "y", "U", "R", "U", "R'"], durations: [500, 500, 500, 500, 500, 500, 500, 500, 500], delay: 800, highlight: ["W", "O", "G", "R", "B", "Y", "WGR", "WGO", "WG", "WO", "WBO", "WBR", "WR", "WB", "GR", "GO", "BO", "BR"] }
                ]}
                progress
              />               
            </div>
          </div>
        </div>
        <p>{`This step is a mix of creativity and algorithms. The last two steps are purely about algorithms.`}</p>
        <H2>OLL</H2>
        <p>{`OLL stands for Orientation of the Last Layer. In this step, you make the top face all one color. This is also called "orienting" the pieces, hence the name OLL. The top pieces won't usually be in the correct spots relative to each other, so the cube won't be completely solved yet.`}</p>
        <p>{`In the full version of OLL, you choose from a selection of 57 algorithms that you've already memorized and use just one of those algs to orient the top face.`}</p>
        <p>{`Fifty-seven algorithms is a lot to learn. So for beginners, it's broken into two steps, called "looks". In the first look, you use one of three algorithms to orient the edges. In the second, you use one of seven algorithms to orient the corners. Each and every two-look OLL algorithm can be later used in full OLL, so there's no downside to learning this "two-look" version first.`}</p>
        <div className="flex flex-row flex-wrap pb-6 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Goal</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                hints
                labels
                facelets={OLL_GOAL_FACELETS}
                className="w-full h-auto"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example (two-look algs)</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="B' U2 R F2 U2 L' D2 L2 R D2 L2 U2 B2 F U2 B D R U2 F' z2 R' U' D' L F R' D' L U' L' R U2 R' y R' U' R2 U2 R' y U2 R U2 R' U2 R U' R' U' R' U R y U R U R'"
                hints
                labels
                lines={[
                  { moves: ["F", "R", "U", "R'", "U'", "F'", "f", "R", "U", "R'", "U'", "f'"], durations: [437, 437, 437, 437, 437, 437, 437, 437, 437, 437, 437, 437], delay: 300 },
                  { moves: ["U", "R", "U", "R'", "U", "R", "U2'", "R'"], durations: [437, 437, 437, 437, 437, 437, 655, 437], delay: 760 }
                ]}
                progress
              />    
            </div>
          </div>
        </div>
        <H2>PLL</H2>
        <p>{`PLL stands for Permutation of the Last Layer. This final step gets all the top pieces into the correct location, thereby solving the cube.`}</p>
        <div className="flex flex-row flex-wrap pb-6 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Goal</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                hints
                labels
                scramble="z2"
                className="w-full h-auto"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example (full PLL alg)</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="B' U2 R F2 U2 L' D2 L2 R D2 L2 U2 B2 F U2 B D R U2 F' z2 R' U' D' L F R' D' L U' L' R U2 R' y R' U' R2 U2 R' y U2 R U2 R' U2 R U' R' U' R' U R y U R U R' F R U R' U' F' f R U R' U' f' U R U R' U R U2' R'"
                hints
                labels
                lines={[
                  { moves: ["U'", "R'", "U", "R'", "d'", "R'", "F'", "R2", "U'", "R'", "U", "R'", "F", "R", "F", "U2"], durations: [141, 141, 141, 141, 212, 141, 141, 212, 141, 141, 141, 141, 141, 141, 141, 212], delay: 300 }
                ]}
                progress
              />
            </div>
          </div>
        </div>
        <p>{`There's 21 algorithms in the full version and only six in the two-look version. Again, there's no downside to starting with two-look.`}</p>

        <H1>What order do I learn CFOP in?</H1>
        <Story storyParagraphs={[
          `It is a beautiful day, the village in its quiet motion, only the most distant whine of fairies to disturb it. Jera's absence did not yet feel real.`,
          `He walks a few cottages down and knocks at a rickety door. He haltingly tells his old neighbor Yamison what happened. Yamison is quiet.`,
          `"Where do I even begin?" Peaku says.`,
          `Yamison seems to glower at him, though that was just his face, then turns and begins washing vegetables.`,
          `"Doesn't matter," Yamison says.`,
          `"But she's getting further away!"`,
          `"Here, you wash these."`,
          `Peaku glowers in turn.`,
          `Yamison sighs. "I have seen many impossible things. Floating beasts much too heavy to float. A woman controlling things with just her voice. Not to mention the link you formed with your sister, like those in your family before you. But no. You will not find your sister quickly."`,
          `"I need to start somewhere."`,
          `"You'll need to follow your link with her and see where it leads you. Surely you must have known that."`,
          `Peaku nods.`,
          `"Then think. You will be out there in the world for who-knows-how-long. You'll need a basic control of magic. You will need to learn to use a blade. Ahh. Much to do, yes indeed. Now, wash the rest of these beats, would you?"`,
        ]} />

        <p>{`There are some ways in which order matters.`}</p>
        <p>{`You should learn the two-look version of OLL and PLL before you learn the full versions of both. There's no cost to doing it this way, and you benefit by starting to do CFOP solves sooner.`}</p>
        <p>{`You should learn full PLL before you learn full OLL. There are fewer PLL algs, and learning full PLL helps your times more than full OLL. People usually learn full OLL when they solve the cube on average somewhere between 15 to 20 seconds.`}</p>
        <p>{`Beyond that, it doesn't matter. The time people learn full PLL differs a lot more than full OLL, but you can generally learn it as early as you want. You can learn two-look algorithms before you learn a basic version of F2L, or the other way around. You can improve at cross at any point. There will be enough time for all of it.`}</p>
        <H1>More than a name</H1>
        <p>{`It would be easy to assume that once you've learned cross, F2L, full OLL, and full PLL, that you've learned CFOP. In reality, CFOP is more than the steps that make it up. `}</p>
        <H2>Learn fingertricks</H2>
        <p>{`Arguably the most important extra skill is how you turn the cube. This is closely related to learning special ways to turn the cube called fingertricks. With good fingertricks and practice, it is possible to turn the cube quickly and with low risk.`}</p>
        <H2>{`Don't learn lookahead (yet)`}</H2>
        <p>{`"Lookahead" is one skill that you may have already heard about. It is the ability to look ahead to the next step while you solve something else. This can eliminate the pauses between steps because you've already identified the next step before it began. In CFOP, it's mostly used during F2L.`}</p>
        <p>{`This sounds very attractive, because beginners pause during F2L a lot. But it's very hard to get good at lookahead. There are easier ways to reduce pauses, as we'll discuss.`}</p>
        <p>{`This lesson series recommends practicing lookahead only when you have good F2L solutions to most cases, or roughly when you average about 15 second solves.`}</p>
        <H2>Much more</H2>
        <p>{`Each step also has additional concepts that might not be obvious from the outset. One example is recognition strategies. With F2L, OLL, and PLL, it is possible to learn ways to make it faster to recognize what you have to do next.`}</p>
        <p>{`There's plenty of other examples. For now, just know that there is a lot out there to learn. Explore the space however you see fit, or just do a lot of solves and have fun. But either way, now we can begin.`}</p>
      </LessonBody>
    </>
  );
}
