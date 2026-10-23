import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";
import Story from "../LessonStory";
import LessonLink from "../LessonLink";
import LessonList from "../LessonList";
import ExternalLink from "../../ExternalLink";
import { H1, H2 } from "../LessonHeading"
import FurtherLearning, { Citation, type Source } from "../FurtherLearning";
import CubeImage from "../CubeImage";
import type { PieceName } from "../cubeProps";
import HandPointingIcon from "../../icons/hand-pointing";
import CubeScene from "../CubeScene";
import { DEFAULT_SCENE_LOOK } from "../../../utils/cubeSceneAuthoring";
import type { Color } from "../../../composables/recon/SimpleCube";

const SOURCES = [
  {
    id: "xuanyi-yiheng-inspection",
    title: "Xuanyi and Yiheng Inspection",
    attribution: "from Antoine Cantin",
    href: "https://youtu.be/qa6oEFQCX40",
  },
  {
    id: "cubezone-cross-study",
    title: "Cross Study",
    attribution: "by Lars Vandenbergh",
    href: "https://www.cubezone.be/crossstudy.html",
  },
  {
    id: "cubehead-beginner-cross",
    title: "Solving the Cross",
    attribution: "by CubeHead",
    href: "https://youtu.be/M-vKaV2NbEo"
  }
] as const satisfies readonly Source[];

export default function BetterCross() {
  return (
    <>
      <TitleBar title="Better Cross" subtitle="" audience="all" />
      <LessonBody>
        <H1>Disclaimer</H1>
        <p>{`Cross is the first step of the CFOP method. This lesson is intended for people who already know a basic way of solving cross and want to get better.`}</p>
        <p>{`If you don't already know cross, you have two options for how to learn it:`}</p>
        <LessonList style="alpha">
          <span className="font-normal">
            {`Learn a `}
            <LessonLink text="beginner's method" href="/learn/what-to-learn/#beginning" />
            , which includes cross
          </span>
          Just learn cross using those same tutorials
        </LessonList>
        <p>{`You'll benefit from the lesson below once you learn and get comfortable with a basic version of cross. Until then, you can skip this lesson and come back to it. `}</p>
        <H1>The way forward</H1>
        <Story storyParagraphs={[
          `The local swordmaster, Prynth, presents him with a sword, rough and dull. "They're saying you killed your sister."`,
          `Peaku says nothing. The sword feels far too cold in his hands. He does not want to grip it.`,
          `"But look at you. Terrified to hold a blade. Maybe your story is the truth."`,
          `"I don't wish to harm anyone," Peaku says.`,
          `"But harm you will. Not anyone around here, hopefully. Except perhaps a few of those on the council, the bastards. But that road. That road. Out there, you will encounter those who wish you harm."`,
          `"I know."`,
          `Prynth unsheathes his sword, much sharper than the rest. "Then you will know there is no choice. Raise your blade."`
        ]}/>
        <p>{`Many people view the cross step of the most dreadful parts of cubing. Especially planning your cross solution before you start turning. But there is no choice. If we want to get good at CFOP, then we must get good at cross.`}</p>
        <H2>Perspective</H2>
        <p>{`At the time of writing, one of the best cubers in the world is Xuanyi Geng. Xuanyi is among the few who are often able to plan not just their cross solution, `}<b>but the entire first two layers of the cube</b>{`.`}<Citation sources={SOURCES} id="xuanyi-yiheng-inspection" />{` Xuanyi shows what's possible with enough dedication, even if you never try to get quite to his level.`}</p>
        <H2>General improvement path</H2>
        <p>{`The goal is to solve cross and F2L fast. Planning a solution is faster than figuring things out on the fly. So, your improvement in this area can be tracked by how far into the solve you can plan.`}</p>
        <ImprovementPathDiagram />
        <p>{`Each of these things take time. Many people beginning with CFOP can't plan more than a cross piece or two.`}</p>
        <p>{`This lesson will mostly focus on things that will make it easier to plan full cross. In future lessons, we'll cover fingertricks, planning cross plus first F2L pair, and planning xcrosses (extended crosses).`}</p>
        <H1>Improving efficiency</H1>
        <p>{`In cubing, efficiency means reducing the number of moves to solve something. A more efficient cross is easier to plan. In the end, it's all about speed, but a well-planned, efficient cross is usually the fastest.`}</p>
        <p>{`Any cross case can be solved in eight moves or fewer, and almost always (99.95% of the time) in seven moves or fewer.`}<Citation sources={SOURCES} id="cubezone-cross-study" /></p>
        <p>{`Let's look at specific techniques that will make you more efficient, or directly make it easier to solve cross quickly.`}</p>
        <H2>Do cross on bottom</H2>
        <p>{`You may be used to solving cross on the top of the cube or on the side. Meanwhile, F2L is solved with cross on bottom. Solving cross directly on bottom means you will not have to rotate the entire cube before you start F2L.`}</p>
        <p>{`Cross on bottom might feel awkward at first, but remember you're still early in your journey. This is worth fixing. Cross on bottom is also less visible, but you'll learn to plan cross! You won't need to see it that well.`}</p>
        <H2>Solve pieces relative to each other</H2>
        <div className="flex flex-col items-center gap-x-8 sm:flex-row sm:items-start">
          <p className="flex-1">{`The centers of a cube don't move relative to each other. If the yellow center is on top, then orange is always to the right of green, green is always to the left of red, and so on. We can use this information.`}</p>
          <CenterCycleDiagram />
        </div>
        <p>{`Say we're trying to solve a couple of cross pieces. The orange piece is already attached to the white center. The green one isn't in the cross yet. We could solve orange, then solve green.`}</p>
        <div className="flex flex-col gap-1 pb-6">
          <span className="text-sm font-bold">Inefficient way</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="x2 F B' L' D2 B2 U F U L' U' R2 B2 D F2 U D2 F2 D F2 L2 D' B' y2 B' L"
              angles={{ x: -30, y: -45 }}
              hints
              lines={[
                { moves: ["D", "U'", "F2"], durations: [1500, 1500, 2000], delay: 1000, highlight: ["W", "O", "G", "R", "B", "Y", "WO", "WG"] }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`But what if we put the green piece in the cross first?`}</p>
        <div className="flex flex-col gap-1 pb-6">
          <span className="text-sm font-bold">Better way</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="x2 F B' L' D2 B2 U F U L' U' R2 B2 D F2 U D2 F2 D F2 L2 D' B' y2 B' L"
              angles={{ x: -30, y: -45 }}
              hints
              lines={[
                { moves: ["L2", "D"], durations: [2000, 1500], delay: 1000, highlight: ["W", "O", "G", "R", "B", "Y", "WO", "WG"] }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`This demonstrates a really important idea. We can move the bottom layer around when we need to, if it helps us add pieces to the cross.`}</p>
        <p>{`We just have to be sure we put the pieces in the right order. If we're solving white cross, a green piece can't go to the right of an orange piece. Refer to your center colors when you don't remember the order.`}</p>
        <p>{`Here's one more example. We have a cube with just one red-white cross piece left to solve. We could first attach the piece to red, then insert it into the cross. Or we could move the bottom layer instead.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Inefficient way</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="x2 F B' L' D2 B2 U F U L' U' R2 B2 D F2 U D2 F2 D F2 L2 D' B' y2 B' L D U' F2 B L y'"
                angles={{ x: -30, y: 45 }}
                hints
                lines={[
                  { moves: ["R", "U", "R'", "F2"], durations: [1500, 1500, 1500, 2000], delay: 1000, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO"] }
                ]}
                progress
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Better way</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="x2 F B' L' D2 B2 U F U L' U' R2 B2 D F2 U D2 F2 D F2 L2 D' B' y2 B' L D U' F2 B L y'"
                angles={{ x: -30, y: 45 }}
                hints
                lines={[
                  { moves: ["D", "R'", "D'"], durations: [1500, 1500, 1500], delay: 1000, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO"] }
                ]}
                progress
              />
            </div>
          </div>
          <p>{`In the "better way", we notice that turning the green face can put the red piece into the cross in one move. But if we did that right away, the cross pieces would no longer be solved relative to each other. By moving the bottom layer first, we can add the red cross piece between the blue and green ones, then fix cross with a `}<code>{`D'`}</code>{` move.`}</p>
        </div>
        <H2>{`Don't rotate during cross`}</H2>
        <p>{`Similar to how we want to do cross on bottom, we also don't want to rotate the entire cube during cross. Rotating is wasted time, and because cross is so short, you can't usually make up that time by doing faster, easier turns.`}</p>
        <p>{`This is unlike F2L, where rotating can make up for the time it wastes.`}</p>
        <p>{`In a future lesson, we'll talk about fingertricks. Fingertricks help us work around some of the difficulties that a rotationless cross solution creates.`}</p>
        <H2>Know how to solve bad pieces</H2>
        <p>{`Let's ignore the entire cube except for one cross piece. We want to add it to the cross. Sometimes we can do this in one move, sometimes we can't.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Add piece in one move</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="F B' L' D2 B2 U F U L' U' R2 B2 D F2 U D2 F2 D F2 L2 D' x2 L' y' D' d"
                angles={{ x: 30, y: 30 }}
                hints
                lines={[
                  { moves: ["F2"], durations: [2000], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WO"] }
                ]}
                progress
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Can't add piece in one move`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="F B' L' D2 B2 U F U L' U' R2 B2 D F2 U D2 F2 D F2 L2 D' x2 L' y' D' d F R U"
                angles={{ x: 30, y: 30 }}
                hints
                lines={[
                  { moves: ["F2"], durations: [2000], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WO"] }
                ]}
                progress
                orbit
              />
            </div>
          </div>
        </div>
        <p>{`Remember that we can turn the bottom layer however we need. So if it's just one piece, it doesn't matter that the cross piece is in the wrong spot in the `}<code>D</code>{` layer. We can fix it later.`}</p>
        <p>{`If we need to solve a piece that can't go into the cross in one move, we can do it in three moves like this:`}</p>
        <div className="flex flex-col gap-1 pb-8">
          <span className="text-sm font-bold">{`Bad case #1 — Flipped wrong in top`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="x2 F B' L' D2 B2 U F U L' U' R2 B2 D F2 U D2 F2 D F2 L2 D' B' y2 B' L D U' F2 B L y' F' U' E'"
              hints
              lines={[
                { moves: ["R'", "F", "R"], durations: [1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO"] }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`Note how if there isn't a cross piece to the right of the one we're solving, we can skip the last move.`}</p>
        <p>{`What if the cross piece is already in the bottom layer, but flipped the wrong way? Before you click play, think about what you think the best way might be.`}</p>
        <div className="flex flex-col gap-1 pb-8">
          <span className="text-sm font-bold">{`Bad case #2 — Flipped wrong in bottom`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="R2 F' U2 D F L F' D' F2 U' F2 D' R2 D L2 F2 D B2 L D x2 R' D F2 L2 y2"
              angles={{ x: -30, y: 30 }}
              hints
              lines={[
                { moves: ["F'", "D", "R'", "D'"], durations: [1500, 1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO"] }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`With this second bad case, we're just turning the green face to set up into a case we've already seen. We turn green, then move the bottom layer and insert the white-green piece into the cross in the correct relative location. Lastly, we solve cross.`}</p>
        <div className="flex flex-col items-center gap-x-8 sm:flex-row sm:items-start">
          <p className="flex-1">{`There's one more bad case. Sometimes we'll get a piece stuck in between the top and bottom layers, and cross pieces near it are already solved. In this example, the white-green piece is stuck. Technically, we can solve it in one move, but then we would un-solve the white-blue piece.`}</p>
          <div className="flex flex-col gap-1 pb-8">
            <span className="text-sm font-bold">{`Bad case #3 — Stuck piece`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                facelets="WORBYBBGOOWBGWWGROYRGOBGWBRWRGWROWRYYWGGGBBYYRORYOYOYB"
                angles={{ x: -30, y: 30 }}
                hints
                highlight={["WGR", "WBR", "WBO", "WGO", "YGR", "YGO", "YBO", "YBR", "WG", "WR", "WB", "WO", "YG", "YR", "YB", "YO", "GR", "GO", "BR", "BO", "W", "O", "G", "R", "B", "Y"]}
              />
            </div>
          </div>
        </div>
        <p>{`We have two options for how to deal with this. The first option is to move the bottom layer again. Then we can insert the cross piece and restore the cross after. The second option is to turn one of the sides twice, insert the cross piece, then turn that side back.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Bad Case #3 — Option 1</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="F2 B R B2 L' F' B D R U2 L2 D' R2 L2 D F2 U2 L2 F2 L2 F2 x2 L U2 F2 U2"
                angles={{ x: -30, y: 30 }}
                hints
                lines={[
                  { moves: ["D2", "F", "D2"], durations: [2000, 1500, 2000], delay: 500 }
                ]}
                progress
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Bad Case #3 — Option 2</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="F2 B R B2 L' F' B D R U2 L2 D' R2 L2 D F2 U2 L2 F2 L2 F2 x2 L U2 F2 U2"
                angles={{ x: -30, y: 30 }}
                hints
                lines={[
                  { moves: ["R2", "B'", "R2"], durations: [2000, 1500, 2000], delay: 500 }
                ]}
                progress
              />
            </div>
          </div>
        </div>
        <p>{`The second option only works if the piece needs to go on the opposite side from where it is currently. In the example, the green sticker on the edge is next to the blue center, and of course blue and green are on opposite sides of the cube.`}</p>
        <p>{`These are actually the only three bad cases. The solutions we've seen work if you're just trying to solve one cross piece, but if you're trying to solve multiple pieces, there's usually a better way. Read on.`}</p>

        <H2>Use one piece to solve a bad one</H2>
        <p>{`Efficient cross is all about combining steps together. Instead of solving one piece with a few moves, then solving another, you can solve multiple pieces in one motion.`}</p>
        <p>{`Because this idea is so general, there are many ways to combine steps. Let's start with just a basic one you'll see a lot. We'll call it the triangle case.`}</p>
        <div className="flex flex-col gap-1 pb-8">
          <span className="text-sm font-bold">{`Triangle case`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="L2 B2 L2 D B2 U R2 D B2 U R2 B2 L' F2 D R2 B' D U2 B' L' x2 F' U2 L B L U R' U' y2"
              hints
              lines={[
                { moves: ["U", "F", "R'"], durations: [1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WO", "WB"] }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`Here, it's impossible to add the blue-white piece to the cross in one move. It's one of the bad cases. Meanwhile, the orange piece can be put into the cross in one move. If we put the blue piece above the orange before we insert it, then that sets up blue to also be inserted. Very efficient. Remember to check that this will put cross pieces in the correct order.`}</p>
        <p>{`Let's look at one more example of this idea. Here we use one bad piece to solve another bad piece. Very fun!`}</p>
        <div className="flex flex-col gap-1 pb-8">
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="y2 L' U' D2 B2 D R2 F' L' D' R2 D' F2 U2 R2 F2 D2 R2 F2 U F2 R' x2 D' U R' F R"
              angles={{ x: -30, y: 30 }}
              hints
              lines={[
                { moves: ["F'", "R'", "B'"], durations: [1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WR", "WB"] }
              ]}
              progress
            />
          </div>
        </div>
        <H2>Consider dual or full color neutrality</H2>
        <p>{`In our examples, we've been looking at white cross only. But you could be solving on a cross color every time, depending on whichever looks easiest. Should you?`}</p>
        <p>{`Being able to solve any cross color equally well is called being color neutral. Being color neutral can give you easier starts to your solves, but it also means you have to spend extra time figuring out which color of cross to solve. Recognition for the rest of the solve is also harder, in large part because the colors on F2L pieces will be different every time.`}</p>
        <p>{`Another option is to solve cross on just two opposite colors, such as yellow and white. This makes it so you usually won't get terrible cross cases, but recognition for the rest of the solve is still similar to what you're used to. This is called dual color neutrality.`}</p>
        <div className="mt-6 mb-1 overflow-x-auto border-[1.5px] border-primary-500 rounded-[9px]">
          <table className="w-full text-xs sm:text-sm text-left text-primary-200">
            <thead className="text-dark_accent bg-primary-700">
              <tr>
                <th className="px-2 sm:px-3 py-2 border-r border-primary-600"></th>
                <th className="px-2 sm:px-3 py-2 border-r border-primary-600 sm:hyphens-none">{"In\u00ADspec\u00ADtion"}</th>
                <th className="px-2 sm:px-3 py-2 border-r border-primary-600 sm:hyphens-none">{"Rec\u00ADog\u00ADni\u00ADtion"}</th>
                <th className="px-2 sm:px-3 py-2 border-r border-primary-600">
                  Average optimal move count
                  <sup>
                    <a href="#color-neutrality-data-note" className="text-primary-100 no-underline! hover:text-primary-300">*</a>
                  </sup>
                </th>
                <th className="px-2 sm:px-3 py-2">
                  Chance of short cross<br/>(4 moves or fewer)
                  <sup>
                    <a href="#color-neutrality-data-note" className="text-primary-100 no-underline! hover:text-primary-300">*</a>
                  </sup>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-primary-800 border-t border-primary-600">
                <td className="px-2 sm:px-3 py-2 font-medium text-primary-100 border-r border-primary-600">{`One cross color only`}</td>
                <td className="px-2 sm:px-3 py-2 border-r border-primary-600">{`Easiest`}</td>
                <td className="px-2 sm:px-3 py-2 border-r border-primary-600">{`Easiest`}</td>
                <td className="px-2 sm:px-3 py-2 border-r border-primary-600">{`5.8`}</td>
                <td className="px-2 sm:px-3 py-2">{`6.0%`}</td>
              </tr>
              <tr className="bg-primary-800 border-t border-primary-600">
                <td className="px-2 sm:px-3 py-2 font-medium text-primary-100 border-r border-primary-600">{`Dual color neutral`}</td>
                <td className="px-2 sm:px-3 py-2 border-r border-primary-600">{`Average`}</td>
                <td className="px-2 sm:px-3 py-2 border-r border-primary-600">{`Average`}</td>
                <td className="px-2 sm:px-3 py-2 border-r border-primary-600">{`5.4`}</td>
                <td className="px-2 sm:px-3 py-2">{`11.6%`}</td>
              </tr>
              <tr className="bg-primary-800 border-t border-primary-600">
                <td className="px-2 sm:px-3 py-2 font-medium text-primary-100 border-r border-primary-600">{`Fully color neutral`}</td>
                <td className="px-2 sm:px-3 py-2 border-r border-primary-600">{`Harder`}</td>
                <td className="px-2 sm:px-3 py-2 border-r border-primary-600">{`Harder`}</td>
                <td className="px-2 sm:px-3 py-2 border-r border-primary-600">{`4.8`}</td>
                <td className="px-2 sm:px-3 py-2">{`29.2%`}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div id="color-neutrality-data-note" className="mb-6 md:text-sm text-xs scroll-mt-24">
          {`*Data from the `}
          <a
            href="https://www.cubezone.be/crossstudy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 underline underline-offset-2 hover:text-primary-300 transition-colors"
          >
            cross study
          </a>
          {` by Lars Vandenbergh`}
        </div>
        <p>{`It's hard to know what's best. The current zeitgeist is to use dual, but that may change. There are plenty of examples of very fast cubers who use full, partial, or no color neutrality. Some cubers might mostly solve on one or two colors, but then solve on other colors when they look easy. You can choose whichever option suits you.`}</p>
        <p>{`But choose soon. The longer you delay learning to start the solve on different colors, the harder it becomes to learn. Recognition becomes more habitual over time, and your pattern recognition strategies have to change when you use more colors.`}</p>
        <H2>Use replacement</H2>
        <div className="flex flex-col items-center gap-x-8 sm:flex-row sm:items-start">
          <p className="flex-1">{`Here we have a scramble where there's two pieces already add to cross: blue and orange. But they're in the wrong order. Orange needs to go to the left of blue, not the right.`}</p>
          <div className="w-80 h-80 mb-8 shrink-0 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeImage
              facelets="WBBOYRROBRWYWWYBBWWBYGOOGOOOWRGBYGRRYYOGRWGRWGYBGGROBY"
              angles={{ x: 30, y: -30 }}
              hints
              highlight={["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR"]}
            />
          </div>
        </div>
        <p>{`We can fix the order by taking one piece out of the cross, moving the rest of the cross, then putting the cross piece back in.`}</p>
        <div className="flex flex-col gap-1 pb-8">
          <span className="text-sm font-bold">{`Fixing color order`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="L' B D2' B U2' B' R2' U2' B2' U2' B' L2' D2' U' B2' F D2' R' B R' z2' F R y R B'"
              hints
              lines={[
                { moves: ["F", "D2", "F'"], durations: [1500, 2000, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR"] }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`This is already an improvement over something you might do as a beginner. But we can do better. What if, when we take out orange, we put in a different cross piece in its place?`}</p>
        <div className="flex flex-col gap-1 pb-8">
          <span className="text-sm font-bold">{`Replacement technique`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="L' B D2' B U2' B' R2' U2' B2' U2' B' L2' D2' U' B2' F D2' R' B R' z2' F R y R B'"
              hints
              lines={[
                { moves: ["R'", "F", "D2", "F'"], durations: [1500, 1500, 2000, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR"] }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`When we use this replacement technique, we just have to be sure to replace the existing piece with the right one. The piece we want to put to the right of blue is red, so this works here.`}</p>
        <p>{`Notice how in these examples, we're moving a cross piece that was already solved. We don't have to always leave our solved pieces alone. Keep your thinking flexible!`}</p>
        <p>{`Here's another example, useful for when you make a mistake with color order during cross. Here we replace blue with orange, then put blue back in.`}</p>
        <div className="flex flex-col gap-1 pb-8">
          <span className="text-sm font-bold">{`Double replacement`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="x2 y L' F2 D2 B2 L2 B D F' D2 B' D2 F' U2 B' R2 B2 L2 U2 F' U F' D' B2 R D F2 y2"
              hints
              angles={{ x: -30, y: 30 }}
              lines={[
                { moves: ["R", "D", "R'", "D'", "R"], durations: [1500, 1500, 1500, 1500, 1500], delay: 500 }
              ]}
              progress
            />
          </div>
        </div>
        <H2>Consider the order you'll solve pieces</H2>
        <p>{`When we looked at bad pieces, we showed how to use one piece to solve another. This hints at how the order you solve pieces is important. The more moves a piece takes to solve, the more strongly you should incorporate solving it into the rest of your cross solution.`}</p>
        <p>{`In this example, the red piece flipped incorrectly in the bottom layer. We solve the rest of cross while we solve the red piece.`}</p>
        <div className="flex flex-col gap-1 pb-8">
          <span className="text-sm font-bold">{`Bad red first`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="U' B2 U2 R2 B R' L' U' R L2 F2 U' R2 D' F2 L2 D2 B2 L2 F2 R2 x2"
              hints
              angles={{ x: -30, y: 120 }}
              lines={[
                { moves: ["R'", "D2", "B'", "R'", "D'", "L'"], durations: [1500, 2000, 1500, 1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO"] }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`First we take out the red and add green to the cross. This also sets up red and blue, but we have to do `}<code>D2</code>{` so that we don't mess up the color order. Then when we add red to the cross, it also connects the orange piece to the orange center. Finally we add blue, fix our cross location, and solve orange.`}</p>
        <p>{`It doesn't always work out this way though. In this next example, it was easier to get the blue piece out of the way so that we can set up into a triangle case for the remaining two pieces.`}</p>
        <div className="flex flex-col gap-1 pb-8">
          <span className="text-sm font-bold">{`Easy blue first`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="D R' F2 R' F2 L F2 R' B2 D2 L' B2 R F D F L B' R U2 B' x2"
              angles={{ x: -30, y: 60 }}
              hints
              lines={[
                { moves: ["F", "B2", "R", "B'"], durations: [1500, 2000, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO"] }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`With how useful it is to move the cross around on the bottom layer, your cross solution may have several `}<code>D</code> {` moves. Solving pieces in the right order can also eliminate some `}<code>D</code> {` moves.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Worse order (6 moves)</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="U B' L D R F R2 U R' B' U2 R2 D R2 D L2 U' F2 L2 D L2 x2 U R' U L' f U f' R' F' R y'"
                angles={{ x: -30, y: 45 }}
                hints
                lines={[
                  { moves: ["D2", "R", "D2", "R", "D", "L"], durations: [2000, 1500, 2000, 1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO"] }
                ]}
                progress
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Better order (5 moves)</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="U B' L D R F R2 U R' B' U2 R2 D R2 D L2 U' F2 L2 D L2 x2 U R' U L' f U f' R' F' R y'"
                angles={{ x: -30, y: 45 }}
                hints
                lines={[
                  { moves: ["R2", "D2", "R'", "D'", "L"], durations: [2000, 2000, 1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO"] }
                ]}
                progress
              />
            </div>
          </div>
        </div>
        <H2>Use example cross solutions</H2>
        <p>{`Tutorials like this one are only one half of the story. Cross solutions are extremely varied, and so it's not feasible to cover every possible cross case in a tutorial.`}</p>
        <p>{`To get more ideas on how to solve cross, we can look at examples. Here are a couple videos worth checking out right now:`}</p>
        <ol className="list-inside list-decimal text-base text-neutral-400 leading-relaxed sm:text-md space-y-2 mb-4 pb-4">
          <li>
            <ExternalLink href="https://www.youtube.com/watch?v=VL0GivCaswk" text="Intermediate cross examples by Feliks Zemdegs" />
          </li>
          <li>
            <ExternalLink href="https://youtu.be/ptSCEXbPN-E" text="3x3 Walkthrough Solves by CubeHead" />
          </li>
        </ol>
        <p>{`As you get more experienced, you should seek out more advanced examples. That way you keep getting new ideas.`}</p>
        <H1>How to practice cross</H1>
        <p>{`Cross is a creative, if not even joyful process. When you practice cross, you should consider all sorts of possibilities. You may uncover a better way of thinking about something, or just save a move or two.`}</p>
        <p>{`In official WCA competition, you only get 15 seconds to plan the start of your solve before you begin. When you practice, don't worry too much about this. Getting comfortable with cross takes time, and you'll get better the more time you spend on it.`}</p>
        <p>{`Unless you have a competition in the next week or two, the common wisdom is to not set a time limit for yourself. Inspect and plan as far as you can. Or at least for as long as you have patience.`}</p>
        
        <FurtherLearning sources={SOURCES} />
      </LessonBody>
    </>
  );
}

const CENTER_SQUARE_SIZE = 36;
const CENTER_SPACING = 44;
const CYCLE_RADIUS = 60;
const CYCLE_ARC_INSET_DEGREES = 26;
const SIDE_CENTERS_IN_CYCLE_ORDER: Color[] = ["G", "O", "B", "R"];

function pointAt(radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: radius * Math.cos(radians), y: radius * Math.sin(radians) };
}

function CenterCycleDiagram() {
  const colors = DEFAULT_SCENE_LOOK.colors;
  const sideCenters = SIDE_CENTERS_IN_CYCLE_ORDER.map((color, index) => {
    const degrees = 90 - 90 * index;
    return { color, degrees, ...pointAt(CENTER_SPACING, degrees) };
  });
  const squares = [{ color: "Y" as Color, x: 0, y: 0 }, ...sideCenters];

  return (
    <figure className="mb-4 shrink-0">
      <svg
        viewBox="-70 -70 140 140"
        className="size-44"
        role="img"
        aria-label="Yellow center on top, seen from above. Going around it: green, orange, blue, red, then back to green."
      >
        <defs>
          <marker
            id="center-cycle-arrow"
            viewBox="0 0 6 6"
            refX={5}
            refY={3}
            markerWidth={4}
            markerHeight={4}
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" className="fill-dark_accent" />
          </marker>
        </defs>
        {squares.map((square) => (
          <rect
            key={square.color}
            x={square.x - CENTER_SQUARE_SIZE / 2}
            y={square.y - CENTER_SQUARE_SIZE / 2}
            width={CENTER_SQUARE_SIZE}
            height={CENTER_SQUARE_SIZE}
            rx={1}
            fill={colors[square.color]}
          />
        ))}
        {sideCenters.map((center) => {
          const start = pointAt(CYCLE_RADIUS, center.degrees - CYCLE_ARC_INSET_DEGREES);
          const end = pointAt(CYCLE_RADIUS, center.degrees - 90 + CYCLE_ARC_INSET_DEGREES);
          return (
            <path
              key={center.color}
              d={`M ${start.x} ${start.y} A ${CYCLE_RADIUS} ${CYCLE_RADIUS} 0 0 0 ${end.x} ${end.y}`}
              fill="none"
              className="stroke-dark_accent"
              strokeWidth={2.5}
              strokeLinecap="round"
              markerEnd="url(#center-cycle-arrow)"
            />
          );
        })}
      </svg>
    </figure>
  );
}

const CROSS_PIECES: PieceName[] =["W", "Y", "G", "R", "B", "O", "WB", "WG", "WO", "WR"];
const XCROSS_PIECES: PieceName[] = [...CROSS_PIECES, "GR", "WGR"];
const XXCROSS_PIECES: PieceName[] = [...XCROSS_PIECES, "GO", "WGO"];

type ImprovementPathStep = {
  label: string;
  cubes: { scramble: string; highlight: PieceName[] }[];
  showHand: boolean;
};

const IMPROVEMENT_PATH_STEPS: ImprovementPathStep[] = [
  {
    label: "Plan part of cross in inspection",
    cubes: [{ scramble: "z2 B2 L2 U' L", highlight: CROSS_PIECES }],
    showHand: false,
  },
  {
    label: "Plan full cross in inspection",
    cubes: [{ scramble: "z2", highlight: CROSS_PIECES }],
    showHand: false,
  },
  {
    label: "Plan full cross plus good fingertricks",
    cubes: [{ scramble: "z2", highlight: CROSS_PIECES }],
    showHand: true,
  },
  {
    label: "Plan cross plus first F2L pair and sometimes xcross",
    cubes: [
      { scramble: "z2 L' U' L", highlight: XCROSS_PIECES },
      { scramble: "z2", highlight: XCROSS_PIECES },
    ],
    showHand: true,
  },
  {
    label: "Plan even more",
    cubes: [{ scramble: "z2", highlight: XXCROSS_PIECES }],
    showHand: true,
  },
];

const IMPROVEMENT_PATH_WIDE_COLUMNS = 3;

const IMPROVEMENT_PATH_SIZES = {
  "--gap": "2rem",
  "--cell": `calc((100cqw - ${IMPROVEMENT_PATH_WIDE_COLUMNS - 1} * var(--gap)) / ${IMPROVEMENT_PATH_WIDE_COLUMNS})`,
  "--box-inset": "calc(1rem + 3px)",
  "--narrow-cube": "min(12rem, calc((100cqw - 0.75rem - var(--box-inset)) / 2))",
  "--wide-cube": "calc(var(--cell) - var(--box-inset))",
} as React.CSSProperties;

type PlacedImprovementPathStep = ImprovementPathStep & {
  startsWideRow: boolean;
  columnsBackToPrevious: number;
};

function placeStepsInWideGrid(steps: ImprovementPathStep[]) {
  let column = 0;
  let previousLastColumn = 0;
  return steps.map((step): PlacedImprovementPathStep => {
    const span = step.cubes.length;
    const startsWideRow = column > 0 && column + span > IMPROVEMENT_PATH_WIDE_COLUMNS;
    if (startsWideRow) column = 0;
    const placed = { ...step, startsWideRow, columnsBackToPrevious: previousLastColumn - column };
    previousLastColumn = column + span - 1;
    column += span;
    return placed;
  });
}

function DownArrow({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div className={`flex -translate-x-1/2 flex-col items-center ${className}`} style={style}>
      <div className="w-0.5 flex-1 bg-dark_accent" />
      <div className="size-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-dark_accent" />
    </div>
  );
}

function ImprovementPathDiagram() {
  const firstCubeCenter = "calc(var(--box-inset) / 2 + var(--cube) / 2)";
  return (
    <figure
      className="@container mb-4"
      role="img"
      aria-label={IMPROVEMENT_PATH_STEPS.map((step) => step.label).join(", then ") + "."}
    >
      <div
        className="grid grid-cols-1 gap-(--gap) [--cube:var(--narrow-cube)] @min-[30rem]:grid-cols-3 @min-[30rem]:[--cube:var(--wide-cube)]"
        style={IMPROVEMENT_PATH_SIZES}
      >
        {placeStepsInWideGrid(IMPROVEMENT_PATH_STEPS).map((step, index) => (
          <div
            key={step.label}
            className={`relative ${step.cubes.length > 1 ? "@min-[30rem]:col-span-2" : ""}`}
          >
            {index > 0 && (
              <DownArrow
                className="absolute bottom-full h-(--gap) @min-[30rem]:hidden"
                style={{ left: firstCubeCenter }}
              />
            )}
            {index > 0 && !step.startsWideRow && (
              <div className="absolute top-1/2 right-full hidden w-(--gap) -translate-y-1/2 items-center px-1 @min-[30rem]:flex">
                <div className="h-0.5 flex-1 bg-dark_accent" />
                <div className="size-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-dark_accent" />
              </div>
            )}
            {step.startsWideRow && (
              <div
                className="absolute bottom-full hidden h-(--gap) @min-[30rem]:block"
                style={{
                  left: firstCubeCenter,
                  width: `calc(${step.columnsBackToPrevious} * (var(--cell) + var(--gap)))`,
                }}
              >
                <div className="absolute top-0 right-0 h-1/2 w-0.5 translate-x-1/2 bg-dark_accent" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-dark_accent" />
                <DownArrow className="absolute top-1/2 bottom-0 left-0" />
              </div>
            )}
            <div className="relative flex h-full w-fit flex-col gap-1 rounded-[9px] border-[1.5px] border-primary-500 bg-primary-700 px-2 py-1.5 @min-[30rem]:w-full">
              <span className="w-0 min-w-full text-sm text-primary-200">
                <b className="text-primary-100 pr-1">{`${index + 1}. `}</b>
                {step.label}
              </span>
              <div className="flex justify-between">
                {step.cubes.map((cube) => (
                  <CubeImage
                    key={cube.scramble}
                    scramble={cube.scramble}
                    highlight={cube.highlight}
                    shade="#888888"
                    dim={0.3}
                    className="size-(--cube) shrink-0"
                  />
                ))}
              </div>
              {step.showHand && (
                <HandPointingIcon className="absolute right-2 bottom-2 size-10 text-primary-100" />
              )}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
