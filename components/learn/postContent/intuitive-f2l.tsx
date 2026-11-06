import type { ReactNode } from "react";
import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";
import Story from "../LessonStory";
import LessonLink from "../LessonLink";
import LessonList from "../LessonList";
import CubeScene from "../CubeScene";
import AnnotatedCubeScene from "../AnnotatedCubeScene";
import CubeImage, { type CubeImageProps } from "../CubeImage";
import CubeWrapper from "../CubeWrapper";
import ExternalLink from "../../ExternalLink"
import { SCENE_PX, apply, mul, sceneGeometry } from "../../../utils/cubeSvgRender";
import { H1, H2, H3 } from "../LessonHeading";
import type { PieceName } from "../cubeProps";
import FurtherLearning, { Citation, type Source } from "../FurtherLearning";
import { crossIcon } from "../../../composables/recon/stepIconDescriptors";
import { DEFAULT_SCENE_LOOK } from "../../../utils/cubeSceneAuthoring";

const BOTTOM_LEFT_TEXT = { x: 2, y: 96, anchor: "bottom-left", duration: 2000 } as const;

// Lesson inspiration came from Frosty, where we discussed including EO as a core part of the lesson.

const LINKS = [ 
  {
    id: "cubehead-f2l-cases",
    title: "All Standard F2L Cases",
    attribution: "by CubeHead",
    href: "https://youtu.be/3tYj-9f4dA0",
  }
] as const satisfies readonly Source[];

export default function IntuitiveF2L() {
  return (
    <>
      <TitleBar title="Intuitive F2L" subtitle="And the tree of possibilities" audience="all" />
      <LessonBody>
        <Story storyParagraphs={[
          `Peaku drops the sword. Blood drips from a cut on his arm.`,
          `Prynth nods. "You found your passion. Good. Let's take a break."`,
          `Prynth returns inside, unbothered. Peaku doubles over, still panting, then drops to the ground. So much to this world: slices, stabs, dodges.`,
          'Tiny claws scratch on bark. High above, a squirrel finds an acorn. Peaku can barely see it among the many branches. But it becomes more visible as it descends. It leaps from one branch to another. Peaku has the sense that the animal does not know the route perfectly.',
          `Eventually, the squirrel is successful. It reaches the lower trunk of the tree, then runs off to bury its acorns.`,
          `So many branches in its world, and yet it persists.`,
          `Peaku struggles to his feet.`
        ]} />
        <p>{`First Two Layers (F2L) is like a tree with many branches. Each branch is like an F2L case that you need to be able to solve. Your goal is to get to the bottom of the tree.`}</p>
        <p>{`It is not possible to memorize all these branches. Not right away. Instead, we figure out our way down the tree, step by step. Each intuitive step will get you closer to the bottom. You can learn more details of the tree over time, which makes you faster and more efficient.`}</p>
        <p>
          <LessonLink text="As we've learned" href="/learn/what-to-learn/#f2l" />
          {`, you solve four corner-and-edge pairs. So it is like we descend the tree four times.`}
        </p>
        <CrossToF2LDiagram />
        <H3>Prerequisites</H3>
        <p>
          {`To start F2L, `}<LessonLink text="cross" href="/learn/better-cross/" />
          {` should already be solved on the bottom of your cube.`}
        </p>
        <p>
          {`You'll also need to know how to read basic `}<LessonLink text="notation" href="/learn/notation/" />
          {`. If you can read `}<code>{`y R U2 R'`}</code>{`, you're ready.`}
        </p>
        <H1>{`Other tutorials`}</H1>
        <p>{`This lesson isn't the simplest possible way to learn F2L. This lesson adds some complexity so that you don't have as many bad habits later.`}</p>
        <p>{`If you'd like something simpler, you could try one of these:`}</p>
        <ol className="list-inside list-decimal text-base text-neutral-400 leading-relaxed sm:text-md space-y-2 pb-6">
          <li>
            <ExternalLink href="https://youtu.be/Ar_Zit1VLG0" text="Tutorial by J Perm" />
          </li>
          <li>
            <ExternalLink href="https://youtu.be/ReOZZHscIGk" text="Tutorial by CubeHead" />
          </li>
          <li>
            <ExternalLink href="https://youtu.be/WB5apB2i_Do" text="Tutorial by RiDo" />
            {` (Diamond in the rough)`}
          </li>
        </ol>
        <p>{`F2L is complex. Any tutorial you follow will take real effort and a good amount of time.`}</p>
        <H1>Finding F2L pieces</H1>
        <p>{`When we solve an F2L pair, we need to find a corner and an edge. The corner piece will always have the cross color on them, and then two other colors. The edge piece will have those two other colors.`}</p>
        <PairColorsDiagram />
        <H2>Finding pieces example</H2>
        <p>{`Cross was solved on white. We can solve any corner piece with white on it. We see the red-blue-white corner piece first. That means we need to find the red-blue edge. This time, it's in the middle layer.`}</p>
        <CubeWrapper titles={["Finding one corner and one edge"]}>
          <CubeImage
            facelets="ROOOYOWYWYWOWWWOWBRRBGBYRBYOYYGRBBRYGGBYGRRGWWBGBORGOG"
            hints
            angles={{ x: 30, y: 210 }}
          />
        </CubeWrapper>
        <H1>Tree overview</H1>
        <p>{`Once we get two F2L pieces to solve, we need to figure out what kind of case we have. In our tree analogy, it's like we're figuring out how high up in the tree we are. We take branches down towards the bottom as we solve it.`}</p>

        {/* TODO: draw a scampering squirrel (real artist) */}
        {/* TODO: draw a sword in the ground */}
        <F2LTreeDiagram />

        <p>{`The fastest way down the tree is skipping as many of these levels as possible. But the fastest way is hard to find, and you wouldn't see familiar branches very often. So to begin, you often stop at several levels.`}</p>

        <H2>Finding your place in the tree</H2>
        <p>{`We need to be able to tell what level we're on at any given time. Think of this like identifying the problem. Once we know the problem, we can descend the tree further.`}</p>

        <p>{`We can figure out which level we're on by asking some questions:`}</p>

        <LevelQuestionsDiagram />

        <p>{`It's mostly straightforward to answer these questions, except with Level 4 and Level 1. Let's talk about those questions.`}</p>


        <H2>Level 4 — Is the edge bad?</H2>
        <p>{`Basically, edges are good when they can be solved with `}<code>R</code>{', '}<code>L</code>{', '}<code>U</code>{', and '}<code>D</code>{` moves. These moves are fast to perform, which is why we call them good edges.`}</p>
        <CubeWrapper titles={["Good edge", "Bad edge"]}>
          <CubeScene
            scramble="x2 R U"
            hints
            labels
            lines={[
              { moves: ["U'", "R'"], durations: [1500, 1500], delay: 500, highlight: [...CENTERS, "BR"] }
            ]}
            progress
          />
          <CubeScene
            scramble="x2 R' F R F'"
            hints
            labels
            lines={[
              { moves: ["U'", "R'"], durations: [1500, 1500], delay: 500, highlight: [...CENTERS, "BR"] }
            ]}
            progress
          />
        </CubeWrapper>
        <p>{`A bad edge ends up flipped in place when we try to solve it with `}<code>RULD</code>{` moves.`}</p>
        <H3>Recognizing a good or bad edge</H3>
        <p>{`We want to be able to tell if an edge is good quickly, without turning the cube.`}</p>
        <p>{`We'll only be talking about F2L edges in the top layer. That edge will have one sticker on top and one sticker on the side. If the side color matches the left or right center color, it's a good edge.`}</p>
        <GoodEdgeDiagram />
        <p>{`What about this orange-green edge? Good or bad?`}</p>
        <p>{`Hint: the labels show that the green center is in the front.`}</p>
        <CubeWrapper>
          <CubeImage
            facelets="ORYGYRGYRGWRWWWRWORGYOGBWGGBYGYOOWOBOBBBBGWBWYOYRRYBRO"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            highlight={["WGR", "WBR", "WBO", "WGO", "YGR", "YGO", "YBO", "YBR", "WG", "WR", "WB", "WO", "YG", "YR", "YB", "YO", "GR", "GO", "BR", "BO", "W", "O", "G", "R", "B", "Y"]}
          />
        </CubeWrapper>
        <input type="checkbox" id="good1-answer" className="hidden peer/good1" />
        <label htmlFor="good1-answer" className="inline-block peer-checked/good1:hidden cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
          Click to reveal the answer
        </label>
        <label htmlFor="good1-answer" className="hidden peer-checked/good1:inline-block cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
          Click to hide the answer
        </label>
        <div className="opacity-0 peer-checked/good1:opacity-100 transition-opacity duration-500 text-neutral-400 mb-4">
          {`It's a good edge. The left center is red, so the right center is orange. The side color on the edge matches the right center.`}
        </div>
        <H2>Level 1 — Are the pieces paired?</H2>
        <p>{`"Paired" means the F2L pieces can be solved in 3 or 4 moves. There's only two types of pairs: connected and split.`}</p>
        <H3>Recognizing a connected pair</H3>
        <p>{`A connected pair is when the pieces are adjacent and the colors line up correctly. As far as this lesson is concerned, the edge must be good too. If the edge is bad, we're still on Level 4.`}</p>
        <CubeWrapper titles={["Connected pair on left"]}>
          <CubeImage
            facelets="OYORYORYGGWRWWWWWWWBYGRRORBRBBGGGYGGYRWOOOOORBBBYBYGBY"
            angles={{ x: 30, y: -45 }}
            hints
            labels
            highlight={["WG", "WO", "WR", "WB", "WBR", "BR", "W", "O", "G", "R", "B", "Y"]}
          />
        </CubeWrapper>
        <p>{`On the F2L pieces above, blue lines up with blue and red lines up with red.`}</p>
        <H3>Recognizing a split pair</H3>
        <p>{`A split pair is when you can do a single move and make what looks like a connected pair.`}</p>
        <CubeWrapper titles={["Confirming split pair — Example 1", "Confirming split pair — Example 2"]}>
          <CubeScene
            scramble="y R B U' F2' D' F2' U L2' U R2' F2' L2' F2' U' R F' D2' L U2' B' F2' x2 F R2' D' R' D2' F2' L U L' R' U' R y' R U' R' U2' U R U' R' U R U2' R'"
            angles={{ x: 30, y: 45 }}
            hints
            labels
            lines={[
              { moves: ["R'"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "BO", "WBO"] },
            ]}
            progress
            startHighlighted
          />
          <CubeScene
            scramble="B R F2 U2 F2 D2 L U2 L2 B2 U2 L2 F2 U F' L' F2 R F L U' x2 F L2 F D L' D L' R' U2 R y2 U"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            lines={[
              { moves: ["L'"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WGR", "GR"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`Split pairs can be difficult to recognize. Notice these properties:`}</p>
        <LessonList>
          {"On the corner, the cross color is never on top."}
          {"The top colors on the corner and the edge are different"}
          {`The edge is "behind" the corner. See explanation below.`}
        </LessonList>
        <p>{`When you can connect the corner to the edge, you can imagine it like you're moving the corner back towards the edge. So the edge is always behind the corner.`}</p>
        <p>{`If you don't have a connected or split pair, and the edge is good, you probably have a Level 2 or Level 3 case.`}</p>
        <H2>Review</H2>
        <p>{`What level are each of these cases? Remember to check the highest level first, then work your way down.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pt-2">
          <div className="flex flex-col gap-1">
            <div className="w-80 h-80 mb-2  border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                facelets="WBGYYYOOOWWGWWWRWBYGGGBBBBYWRRORRORYWYRBGYRGYBOBGORGOO"
                hints
                labels
                highlight={["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WGO", "GO"]}
              />
            </div>
            <input type="checkbox" id="review1-answer" className="hidden peer/review1" />
            <label htmlFor="review1-answer" className="inline-block peer-checked/review1:hidden cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
              Click to reveal the answer
            </label>
            <label htmlFor="review1-answer" className="hidden peer-checked/review1:inline-block cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
              Click to hide the answer
            </label>
            <div className="w-80 opacity-0 peer-checked/review1:opacity-100 transition-opacity duration-500 text-neutral-400 mb-4">
              {`Level 4. This is a connected pair, but the edge is bad, so it's not Level 1.`}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-80 h-80 mb-2  border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                facelets="OYGOYYYBBWWWWWWRWBOOWGBBBBGRRRYRRORYWOBBGYRGYYGGGORGOO"
                angles={{ x: 30, y: -30 }}
                hints
                labels
                highlight={["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WBO", "BO"]}
              />
            </div>
            <input type="checkbox" id="review2-answer" className="hidden peer/review2" />
            <label htmlFor="review2-answer" className="inline-block peer-checked/review2:hidden cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
              Click to reveal the answer
            </label>
            <label htmlFor="review2-answer" className="hidden peer-checked/review2:inline-block cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
              Click to hide the answer
            </label>
            <div className="w-80 opacity-0 peer-checked/review2:opacity-100 transition-opacity duration-500 text-neutral-400 mb-4">
              {`Level 5. One piece is in the bottom layer.`}
            </div>
          </div>
        </div>

        <H1>Descending the tree</H1>
        <p>{`We're going to descend the tree by combining "triggers". Triggers are short, fast sequences of moves. You might already know one, called "sexy move", which is `}<code>{`R U R' U'`}</code>.</p>
        <p>{`All of the triggers we'll need are going to use `}<code>R</code>{`, `}<code>U</code>{`, and `}<code>L</code>{` moves. We won't use `}<code>F</code>{` or `}<code>B</code>{` moves. Turning the front and back faces is usually slow.`}</p>
        <p>{`We'll use `}<code>y</code>{` moves only on Level 4. Besides that, don't rotate the cube. If you can't see pieces, you can tilt the cube a little instead.`}</p>
        <p>{`All these restrictions will make it easier to figure out what to do. You'll have fewer options, which means there's fewer things to try.`}</p>
        <H2>On Level 5? Get pieces in top layer</H2>
        <p>{`When we're on Level 5, our goal is to get both pieces into the top layer.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Level 5 — Example 1</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                facelets="GOYGYBBBOYWWWWWGWWYRWOBBGBGBYOORYORBBGRRGRRGRWYRGOYYOO"
                hints
                labels
                highlight={["W", "O", "G", "R", "B", "Y", "WO", "WB", "WR", "WG", "WBO", "BO"]}
              />
            </div>
          </div>
          <F2LSlotsDiagram />
        </div>
        <p>{`Here we have a blue-orange edge piece stuck in the front-right "slot". A slot is a location where an F2L corner and edge pair will go.`}</p>
        <p>{`Any trigger we do will make changes to one of these slots. We'll call the slot we change our "target slot".`}</p>
        <p>{`On Level 5, the slot we want to change is the one with F2L pieces in it. We want to take them out of the slot.`}</p>
        <p>{`First, find the `}<code>R</code>{` or `}<code>L</code>{` move that lifts the target slot into the top layer.`}</p>
        <CubeWrapper titles={["Lift up target slot"]}>
          <CubeScene
            scramble="U' R' U B2 D R F' U2 R2 U B2 D' F2 B2 U' F2 D B2 D' F' L' x2 D L' F' L2 D U2 R' U R U'"
            hints
            labels
            lines={[
              { moves: ["R"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WO", "WG", "WB", "WR", "WBO", "BO"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`Next, we could do either `}<code>U</code>{`, `}<code>{`U'`}</code>{`, or `}<code>U2</code>{`. Soon you'll see why we have options. We'll try `}<code>U</code>{` first.`}</p>
        <p>{`After, we'll do `}<code>{`R'`}</code>{` to solve cross again. We always need to undo the move that we used to lift up the target slot.`}</p>
        <p>{`We're just doing a trigger: `}<code>{`R U R'`}</code>.</p>
        <CubeWrapper titles={["Trying R U R'"]}>
          <CubeScene
            scramble="U' R' U B2 D R F' U2 R2 U B2 D' F2 B2 U' F2 D B2 D' F' L' x2 D L' F' L2 D U2 R' U R U'"
            hints
            labels
            lines={[
              { moves: [["R"], ["U"], ["R'"]], durations: [1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WO", "WG", "WB", "WR", "WBO", "BO"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`It didn't really work. It did take the edge out of the middle layer, but it put the corner we need into the bottom layer.`}</p>
        <p>{`This is why you have the option of doing a different `}<code>U</code>{` move in the middle. Another option is to do a `}<code>U</code>{` move before the trigger.`}</p>
        <p>{`Let's go back to the original case and try both:`}</p>
        <CubeWrapper titles={["Trying doing a U move first (U R U R')", "Trying different trigger (R U2 R')"]}>
          <CubeScene
            scramble="U' R' U B2 D R F' U2 R2 U B2 D' F2 B2 U' F2 D B2 D' F' L' x2 D L' F' L2 D U2 R' U R U'"
            hints
            labels
            lines={[
              { moves: [["U"], ["R"], ["U"], ["R'"]], durations: [1500, 1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WO", "WG", "WB", "WR", "WBO", "BO"] }
            ]}
            progress
            startHighlighted
          />
          <CubeScene
            scramble="U' R' U B2 D R F' U2 R2 U B2 D' F2 B2 U' F2 D B2 D' F' L' x2 D L' F' L2 D U2 R' U R U'"
            hints
            labels
            lines={[
              { moves: [["R"], ["U2"], ["R'"]], durations: [1500, 2000, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WO", "WG", "WB", "WR", "WBO", "BO"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`Both worked! In both cases, both pieces are in the top layer.`}</p>
        <p>{`Doing a `}<code>U</code>{` move first worked because it got the corner out of the way before we started. The different trigger worked because it got both pieces out of the way before we did `}<code>{`R'`}</code>.</p>
        <p>{`To summarize, we descend from Level 5 by:`}</p>
        <LessonList>
          <span className="font-normal">{`(Sometimes) Doing a `}<code>U</code>{` move.`}</span>
          <span className="font-normal">{`Moving the target slot up into the top using an `}<code>R</code>{` or `}<code>L</code>{` move.`}</span>
          <span className="font-normal">{`Doing a `}<code>U</code>{` move.`}</span>
          <span className="font-normal">{"Undoing the original "}<code>R</code>{` or `}<code>L</code>{` move.`}</span>
        </LessonList>
        <p>{`We're basically doing a `}<code>U</code>{` move and then a trigger. We'll use this idea on a lot of the levels.`}</p>
        <H3>Bonus example</H3>
        <p>{`This time, the stuck piece is in the back-left slot.`}</p>
        <CubeWrapper titles={["Level 5 — Example 2"]}>
          <CubeImage
            facelets="GOYGYBBBOYWWWWWGWWYRWOBBGBGBYOORYORBBGRRGRRGRWYRGOYYOO"
            angles={{ x: 30, y: -45 }}
            hints
            labels
            highlight={["WG", "W", "O", "G", "R", "B", "Y", "WO", "WB", "WR", "WGR", "GR"]}
          />
        </CubeWrapper>
        <p>{`You can tilt the cube if you need to see pieces in the back better, but don't change your grip on the cube or do `}<code>y</code>{` or `}<code>U</code>{` moves. This helps avoid common bad habits.`}</p>
        <p>{`The corner is right on top of the edge, so we'll do a `}<code>U</code>{` move to get it out of the way. Here's the full solution:`}</p>
        <CubeWrapper>
          <AnnotatedCubeScene
            scramble="U' R' U B2 D R F' U2 R2 U B2 D' F2 B2 U' F2 D B2 D' F' L' x2 D L' F' L2 D U2 R' U R U'"
            angles={{ x: 30, y: -45 }}
            hints
            labels
            lines={[
              { moves: ["U", "L", "U", "L'"], durations: [1500, 1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGR", "GR"] }
            ]}
            annotations={[
              { ...BOTTOM_LEFT_TEXT, text: "Get corner out of the way", moves: [0, 0] },
              { ...BOTTOM_LEFT_TEXT, text: "Expose back left slot", moves: [1, 1] },
              { ...BOTTOM_LEFT_TEXT, text: "Take edge out of slot", moves: [2, 2] },
              { ...BOTTOM_LEFT_TEXT, text: "Fix cross", moves: [3, 3] },
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>

        <H2>On Level 4? Make edge good</H2>
        <p>{`After Level 5, descending from Level 4 should feel like a breath of fresh air. All we have to do is a `}<code>y</code>{` or `}<code>{`y'`}</code>{` when there's a bad edge. `}</p>
        <p>{`Here's a Level 4 case, meaning the edge is bad and both pieces are in the top layer. We can rotate either direction and that'll make the edge good.`}</p>
        <CubeWrapper titles={["Level 4 example", "Level 4 solution"]}>
          <CubeImage
            facelets="RBGRYORBGYWYWWWOWOYRRYRYBRBWYWBGOOGBOOBGOGWOGWYGRBGYBR"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            highlight={["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WBR", "BR"]}
          />
          <CubeScene
            scramble="R2 F2 L2 D B2 D F2 D2 F2 R2 D2 F L F U B' L D2 B2 D R x2 D B2 D R' y U'"
            angles={{ x: 30, y: 0 }}
            hints
            labels
            lines={[
              { moves: ["y'"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WBR", "BR"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`In the example, we chose to rotate so that the slot we're solving is in the front. We'll talk more about which way to rotate in future lessons.`}</p>

        <H2>On Level 3? Separate pieces</H2>
        <p>{`If the pieces are adjacent, we need to separate them.`}</p>
        <CubeWrapper titles={["Level 3 — Example 1"]}>
          <CubeImage
            facelets="ORYGYGRBOGWYWWWRWGWYWRBGRBBBRGYROORROBGBGYYGBWOBOOYYOW"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            highlight={["W", "O", "G", "R", "B", "Y", "WGO", "GO", "WO", "WB", "WR", "WG"]}
          />
        </CubeWrapper>
        <p>{`From now on, our target slot will be the one we are solving. This example has us solving the orange and green pieces into the back-left.`}</p>
        <p>{`Turn the top layer so that the corner is on the same side as the target slot and the edge isn't. Our target slot is on the left, so we put the corner on the left and the edge more in the middle.`}</p>
        <CubeWrapper titles={["Prepare to separate"]}>
          <CubeScene
            scramble="U F B2 L' B' R F' U' L2 U' F2 U' L2 D2 F2 R2 D' B2 L2 R B' x2 L B D F' D2"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            lines={[
              { moves: ["U'"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WGO", "GO", "WO", "WB", "WR", "WG"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`Then, to separate the pieces, all we need to do is raise the target slot. We always turn the left or right layer, never the front or back.`}</p>
        <CubeWrapper titles={["Separate"]}>
          <CubeScene
            scramble="U F B2 L' B' R F' U' L2 U' F2 U' L2 D2 F2 R2 D' B2 L2 R B' x2 L B D F' D2 U'"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            lines={[
              { moves: ["L"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WGO", "GO", "WO", "WB", "WR", "WG"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>

        <p>{`Next, we turn the top layer so that none of our F2L pieces up there are on the same side as our target slot on the left. All that remains after that is to undo the original `}<code>L</code>{` or `}<code>R</code>{` move.`}</p>
        <p>{`Let's look at a couple attempts at all this:`}</p>
        <CubeWrapper titles={["Trying U' L U L' (Incorrect)", "Trying U' L U' L' (Correct)"]}>
          <CubeScene
            scramble="U F B2 L' B' R F' U' L2 U' F2 U' L2 D2 F2 R2 D' B2 L2 R B' x2 L B D F' D2"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            lines={[
              { moves: [["U'"], ["L"], ["U"], ["L'"]], durations: [1500, 1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WGO", "GO", "WO", "WB", "WR", "WG"]}
            ]}
            progress
            startHighlighted
          />
          <CubeScene
            scramble="U F B2 L' B' R F' U' L2 U' F2 U' L2 D2 F2 R2 D' B2 L2 R B' x2 L B D F' D2"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            lines={[
              { moves: [["U'"], ["L"], ["U'"], ["L'"]], durations: [1500, 1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WGO", "GO", "WO", "WB", "WR", "WG"]}
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`The first example is wrong because the second `}<code>U</code>{` move brought the edge into the top left. We need to get the pieces out of the way before we restore cross.`}</p>
        <p>{`To summarize:`}</p>
        <LessonList>
          <span className="font-normal">{`Figure out if your target slot is on the left or right.`}</span>
          <span className="font-normal">{`Turn the top layer so the corner is on that left-or-right side and the edge isn't.`}</span>
          {`Expose the target slot.`}
          {`Move the edge and/or corner out of the way.`}
          {`Fix cross.`}
        </LessonList>
        <p>{`Solving F2L will sometimes involve "hiding" a piece. Our last example had this. We hid the corner in the bottom layer so that we could move the edge around.`}</p>
        <H3>Bonus example</H3>
        <p>{`Sometimes you don't hide a piece. Here, lifting the target slot to separate the pieces keeps them both in the top layer. We have to be careful to do the right `}<code>U</code>{` move after. Before you click play, figure out which move exposes the target slot.`}</p>
        <CubeWrapper titles={["Level 3 — Example 2"]}>
          <AnnotatedCubeScene
            scramble="U F B2 L' B' R F' U' L2 U' F2 U' L2 D2 F2 R2 D' B2 L2 R B' x2 L B D F' D2 U' L U' L' U L U L' y' U2 R U R' U2 R U R' y2 d'"
            hints
            labels
            angles={{ x: 30, y: -30 }}
            lines={[
              { moves: ["L'", "U2", "L"], durations: [1500,2000,1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGR", "GR"] }
            ]}
            annotations={[
              { ...BOTTOM_LEFT_TEXT, text: "Expose slot and separate pieces", moves: [0, 0] },
              { ...BOTTOM_LEFT_TEXT, text: "Moves pieces out of the way", moves: [1, 1] },
              { ...BOTTOM_LEFT_TEXT, text: "Fix cross", moves: [2, 2] },
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`The corner is already on the left with the target slot, and the edge is in the middle, so we don't need to do any `}<code>U</code>{` moves at the start.`}</p>

        <H2>On Level 2? Pair pieces</H2>

        {/* TODO: add fun image */}
        <H3>Good progress!</H3>
        <p>{`We're more than halfway done. We got the pieces into the top layer, made the edge is good, and separated the pieces. This can all feel like a lot, or even be overwhelming.`}</p>
        <p>{`The good news is that once you know how to do all these steps, you'll be well on your way to having good F2L without a lot of bad habits, just some inefficiencies.`}</p>
        <H3>The three cases</H3>
        <p>{`There's three cases you can have at Level 2. When we have the first two cases, we're going to set up a connected pair. Otherwise, a split pair:`}</p>

        <Level2CasesDiagram />
        
        <p>{`Let's look at how we deal with each case. After, we'll summarize to make this easier to remember.`}</p>
      
        <H3>Cross color on top of corner</H3>
        <p>{`Turn the top layer so that the edge "connects" to the center. The edge and the center color will match. Here's an example:`}</p>
        <CubeWrapper titles={["Cross color on top case — Connect edge"]}>
          <CubeScene
            scramble="y U B2 L D F L' B D R U2 B2 D' B2 D2 B2 L2 D' R2 L2 D L2 x2 L' F' B' R D L2 R U R' d'"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            lines={[
              { moves: ["U"], durations: [1500, 1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WBO", "BO"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`Then, hide the edge by bringing up the target slot. Turn the top layer so that the corner is on top of the edge. Fix cross.`}</p>
        <CubeWrapper titles={["Cross color on top case — Solve case"]}>
          <AnnotatedCubeScene
            scramble="y U B2 L D F L' B D R U2 B2 D' B2 D2 B2 L2 D' R2 L2 D L2 x2 L' F' B' R D L2 R U R' d' U"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            lines={[
              { moves: ["L'", "U'", "L"], durations: [1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WBO", "BO"] }
            ]}
            annotations={[
              { ...BOTTOM_LEFT_TEXT, text: "Hide edge", moves: [0, 0] },
              { ...BOTTOM_LEFT_TEXT, text: "Put corner on top of edge", moves: [1, 1] },
              { ...BOTTOM_LEFT_TEXT, text: "Fix cross", moves: [2, 2] },
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <H3>Top colors match</H3>
        <p>{`This next case, we hide the corner instead of the edge.`}</p>
        <p>{`Turn the top layer so that the corner is diagonal from the target slot. If the target slot is front-right, put the corner in the back-right. If the target slot is back-left, put the corner in the front-left. And so on.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Top colors match case — Place corner diagonal`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="y2 U F U2 D' F' B U' L' F L2 D2 F2 L2 U L2 U' B2 R2 U2 D' x2 D' B R D' B2 L' B' D' U' B U B'"
                angles={{ x: 30, y: -30 }}
                hints
                labels
                lines={[
                  { moves: ["U'"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WBR", "BR"] }
                ]}
                progress
                startHighlighted
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Diagonal from the target slot`}</span>
            <DiagonalDiagram />
          </div>
        </div>
        <p>{`Hide the corner by lifting the target slot.`}</p>
        <p>{`Now ask: Is the corner in the front or back layer?`}</p>
        <p>{`Turn the top layer so that the edge is also in the front or back, whichever layer the corner is in.`}</p>
        <p>{`Then unhide the corner. The pieces will now be paired.`}</p>
        <CubeWrapper titles={["Top colors match case — Solve case", "Top colors match case — Bonus example"]}>
          <AnnotatedCubeScene
            scramble="y2 U F U2 D' F' B U' L' F L2 D2 F2 L2 U L2 U' B2 R2 U2 D' x2 D' B R D' B2 L' B' D' U' B U B'"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            lines={[
              { moves: [["U'"], ["L"], ["U2"], ["L'"]], durations: [1500, 1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WBR", "BR"] }
            ]}
            annotations={[
              { ...BOTTOM_LEFT_TEXT, text: "Place corner diagonal from target slot", moves: [0, 0] },
              { ...BOTTOM_LEFT_TEXT, text: "Hide corner in front", moves: [1, 1] },
              { ...BOTTOM_LEFT_TEXT, text: "Move edge to front with corner", moves: [2, 2] },
              { ...BOTTOM_LEFT_TEXT, text: "Un-hide corner", moves: [3, 3] },
            ]}
            progress
            startHighlighted
          />
          <AnnotatedCubeScene
            scramble="y2 U F U2 D' F' B U' L' F L2 D2 F2 L2 U L2 U' B2 R2 U2 D' x2 D' B R D' B2 L' B' D' U' B U B' L' U2 L d U'"
            hints
            labels
            lines={[
              { moves: ["R", "U", "R'"], durations: [1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGR", "GR"] }
            ]}
            annotations={[
              { ...BOTTOM_LEFT_TEXT, text: "Corner already diagonal. Hide it.", moves: [0, 0] },
              { ...BOTTOM_LEFT_TEXT, text: "Move edge to back with corner", moves: [1, 1] },
              { ...BOTTOM_LEFT_TEXT, text: "Un-hide corner", moves: [2, 2] },
            ]}
            progress
          />
        </CubeWrapper>
        <H3>Top colors different</H3>
        <p>{`The last Level 2 case is when the two colors on top of the F2L pieces are different, but cross color isn't on top.`}</p>
        <p>{`Like in the last case, moves the corner to be diagonal from the target slot.`}</p>
        <CubeWrapper titles={["Top colors different case — Place corner diagonal"]}>
          <CubeScene
            scramble="y U F U2 D' F' B U' L' F L2 D2 F2 L2 U L2 U' B2 R2 U2 D' x2 D' B R D' B2 L' B' D' d U' R U' R' U'"
            hints
            labels
            lines={[
              { moves: ["U2"], durations: [2000], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGO", "GO"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`Hide the corner by raising the target slot.`}</p>
        <p>{`Now ask: is the corner in the left or right layer? We need to put the edge on the opposite layer as that.`}</p>
        <p>{`In our example, the corner is on the right, so the edge needs to go on the left. We turn the top layer accordingly.`}</p>
        <p>{`Then we un-hide the corner as normal.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Top colors different case — Solve case`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <AnnotatedCubeScene
                scramble="y U F U2 D' F' B U' L' F L2 D2 F2 L2 U L2 U' B2 R2 U2 D' x2 D' B R D' B2 L' B' D' d U' R U' R' U' U2"
                hints
                labels
                lines={[
                  { moves: [["R"], ["U"], ["R'"]], durations: [1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGO", "GO"] }
                ]}
                annotations={[
                  { ...BOTTOM_LEFT_TEXT, text: "Hide corner diagonal from target slot", moves: [0, 0] },
                  { ...BOTTOM_LEFT_TEXT, text: "Move edge to opposite side from corner", moves: [1, 1] },
                  { ...BOTTOM_LEFT_TEXT, text: "Fix cross", moves: [2, 2] },
                ]}
                progress
                startHighlighted
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Edge goes opposite`}</span>
            <EdgeOppositeDiagram />
          </div>
        </div>
        <H3>Reviewing Level 2</H3>
        <p>{`Level 2 has the most to remember. Let's update the diagram from earlier with the new information.`}</p>
        <Level2CasesDiagram withInstructions />

        <p>{`We're almost done!`}</p>
        <H2>On Level 1? Insert pair</H2>
        <H3>Solving connected pairs</H3>
        <p>{`Turn the top layer to make sure that the pair isn't in the same layer, left or right, as the target slot.`}</p>
        <CubeWrapper titles={["Connected pair — Get pair out of the way"]}>
          <CubeScene
            scramble="y' R' B2 L' D B D2 B U2 B2 D2 R' B2 R L2 F2 U2 D2 L2 U2 x2 F U L D' F' L' D d U2"
            hints
            labels
            lines={[
              { moves: ["U'"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGR", "GR"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`The target slot is in the right layer, so we turned the top face so that the connected pair isn't in that layer.`}</p>
        <p>{`Then we raise the target slot, connect the pair to the cross edge, and fix cross.`}</p>
        <CubeWrapper titles={["Connected pair — Insert pair", "Connected pair — Bonus example"]}>
          <CubeScene
            scramble="y' R' B2 L' D B D2 B U2 B2 D2 R' B2 R L2 F2 U2 D2 L2 U2 x2 F U L D' F' L' D d U"
            hints
            labels
            lines={[
              { moves: [["R'"], ["U"], ["R"]], durations: [1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGR", "GR"] }
            ]}
            progress
            startHighlighted
          />
          <CubeScene
            scramble="y R' B2 L' D B D2 B U2 B2 D2 R' B2 R L2 F2 U2 D2 L2 U2 x2 F U L D' F' L' D d'"
            angles={{ x: 30, y: -30 }}
            hints
            labels
            lines={[
              { moves: ["U'", "L'", "U", "L"], durations: [1500, 1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "BO", "WBO"] }
            ]}
            progress
          />
        </CubeWrapper>
        <H3>Solving split pairs</H3>
        <p>{`Turn the top layer to put the corner directly above the target slot.`}</p>
        <CubeWrapper titles={["Split pair — Get corner on top of target slot"]}>
          <CubeScene
            scramble="R' D' R U' B2 D R' B R L2 D' R2 D' L2 D R2 B2 D2 B2 U B2 x2 y U'"
            hints
            labels
            lines={[
              { moves: ["U"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "BO", "WBO", "GO", "WGO", "WBR", "BR"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`From there it's very similar to the connected pair case. We raise the target slot, which connects the pieces. Move the `}<code>U</code>{` layer to connect the pair to the cross edge, then fix cross.`}</p>
        <CubeWrapper titles={["Split pair — Insert pair", "Split pair — Bonus example"]}>
          <CubeScene
            scramble="R' D' R U' B2 D R' B R L2 D' R2 D' L2 D R2 B2 D2 B2 U B2 x2 y"
            hints
            labels
            lines={[
              { moves: [["L'"],["U'"],["L"]], durations: [1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "BO", "WBO", "GO", "WGO", "WBR", "BR"] }
            ]}
            progress
            startHighlighted
          />
          <CubeScene
            scramble="R' D' R U' B2 D R' B R L2 D' R2 D' L2 D R2 B2 D2 B2 U B2 x2 y U' U L' U' L U R U' R' U R U2 R' U2"
            hints
            labels
            lines={[
              { moves: ["U2", "R", "U", "R'"], durations: [2000, 1500, 1500, 1500], delay: 500, highlight: ["W", "WB", "WG", "WR", "WO", "GR", "WGR", "O", "G", "R", "B", "Y"] }
            ]}
            progress
          />
        </CubeWrapper>
        <p>{`Notice how when lift up the target slot, we connect the pieces together. Then, it's like we pull the pair into the slot. If you have to solve a split pair into one of the back two slots, it's a bit more like pushing, but nothing about the idea changes.`}</p>

        <H1>Full examples</H1>
        <H2>Example 1</H2>
        <p>{`Let's say we just solved white cross, and we see two F2L pieces right in front of us. The green-orange ones. Let's solve them.`}</p>
        <p>{`Both pieces are in the `}<code>U</code>{` layer, so we skipped Level 5. The edge clearly connects to the front center, not the left or right, so we're on Level 4. We need to rotate the cube.`}</p>
        <CubeWrapper titles={["Example 1 — Make edge good"]}>
          <CubeScene
            scramble="R2 B D2 F D2 F' L2 R2 F L2 D2 F2 D' U B' U2 R' B D2 L' D2 x2 R' B' F L2 D L' B L d U'"
            hints
            labels
            lines={[
              { moves: ["y'"], durations: [1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGO", "GO"] }
            ]}
            progress
          />
        </CubeWrapper>
        <p>{`We chose to rotate so that the orange-green slot is in the front right, where it's easier to see what we're doing.`}</p>
        <p>{`The edge is good now, and in theory we could be on any level from 3 to 1. We're on Level 3 since the pieces are adjacent.`}</p>
        <p>{`We turn the `}<code>U</code>{` layer so that one piece is on the same side, right, as the target slot, and one isn't. Then we raise the target slot, turn the `}<code>U</code>{` layer again so that both pieces aren't on the right-hand side, and fix cross.`}</p>
        <CubeWrapper titles={["Example 1 — Separate pieces"]}>
          <CubeScene
            scramble="R2 B D2 F D2 F' L2 R2 F L2 D2 F2 D' U B' U2 R' B D2 L' D2 x2 R' B' F L2 D L' B L d U' y'"
            hints
            labels
            lines={[
              { moves: ["U", "R", "U2", "R'"], durations: [1500, 1500, 2000, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WO", "WG", "WR", "WB", "WGO", "GO"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`Now we have the Level 2 case where the colors on top of the F2L pieces match.`}</p>
        <p>{`To solve the color-matching case, we hide the corner by putting it diagonal from the target slot. That means putting the corner in the back-right. Then we raise the target slot which hides the corner in the back. The edge needs to move to that same layer: in the back.`}</p>
        <CubeWrapper titles={["Example 1 — Pair pieces"]}>
          <CubeScene
            scramble="R2 B D2 F D2 F' L2 R2 F L2 D2 F2 D' U B' U2 R' B D2 L' D2 x2 R' B' F L2 D L' B L d U' y' U R U2 R'"
            hints
            labels
            lines={[
              { moves: ["U2", "R", "U2", "R'"], durations: [2000, 1500, 2000, 1500], delay: 200, highlight: ["O", "G", "R", "B", "Y", "WG", "WO", "WR", "W", "WB", "WGO", "GO"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`We have a connected pair, which means we need to get it out of the way of the right layer where the target slot is. We choose to do `}<code>{`U'`}</code>{`, but we could have done `}<code>U2</code>.</p>
        <p>{`Raise the target slot, find the right `}<code>U</code>{` move that connects the pair to the cross, then fix cross.`}</p>
        <CubeWrapper titles={["Example 1 — Insert pair"]}>
          <CubeScene
            scramble="R2 B D2 F D2 F' L2 R2 F L2 D2 F2 D' U B' U2 R' B D2 L' D2 x2 R' B' F L2 D L' B L d U' y' U R U2 R' U2 R U2 R'"
            hints
            labels
            lines={[
              { moves: ["U'", "R", "U2", "R'"], durations: [1500, 1500, 2000, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "GO", "WGO"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`This is just an example of the procedure. This isn't actually the best way to solve this pair, because we're allowed to modify other slots than just our target slot, if they aren't solved. But that's beyond the scope of this tutorial.`}</p>
        <H2>Example 2</H2>
        <p>{`In this example, the front two slots are already solved. This won't change much, but it does mean we can't see any pairs very easily. But we do see a blue-red edge. Tilting the cube would reveal that the blue-red-white corner is in the back-right slot. We'll solve that.`}</p>
        <p>{`This is a Level 5 case, so we need to take out the corner. There's many ways we can do this. One idea that works here is to just raise the target slot. That will hide the edge. After that, we move the `}<code>U</code>{` layer to get the corner out of the way, then fix cross again.`}</p>
        <CubeWrapper titles={["Example 2 — Take corner out"]}>
          <CubeScene
            scramble="x2 y' L2 B U' L U' B L B2 U B2 L2 U' L2 U L2 B2 U L2 B2 U2"
            hints
            labels
            lines={[
              { moves: ["R'", "U'", "R"], durations: [1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WR", "WB", "WBR", "BR", "WGO", "GO", "BR", "BO", "WBO", "WBR"] }
            ]}
            progress
          />
        </CubeWrapper>
        <p>{`The top color on the edge is blue, and the side is red. Red does not match the left or right center color, so this is a bad edge. We need to rotate.`}</p>
        <CubeWrapper titles={["Example 2 — Make edge good"]}>
          <CubeScene
            scramble="x2 y' L2 B U' L U' B L B2 U B2 L2 U' L2 U L2 B2 U L2 B2 U2 R' U' R"
            hints
            labels
            lines={[
              { moves: ["y"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WR", "WB", "WBR", "BR", "WGO", "GO", "BR", "BO", "WBO", "WBR"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`The pieces are separated but not paired, so we're on Level 2.`}</p>
        <p>{`The top colors don't match, and it's not a case with cross color on top, so we hide the corner.`}</p>
        <p>{`The corner needs to go diagonal from the target slot, which it already is. The corner is on the right. The edge needs to go on the opposite side: on the left. So we hide the corner, move the edge to the left side, then fix cross.`}</p>

        <CubeWrapper titles={["Example 2 — Pair pieces"]}>
          <CubeScene
            scramble="x2 y' L2 B U' L U' B L B2 U B2 L2 U' L2 U L2 B2 U L2 B2 U2 R' U' R y"
            hints
            labels
            lines={[
              { moves: ["R", "U", "R'"], durations: [1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WR", "WB", "WBR", "BR", "WGO", "GO", "BR", "BO", "WBO", "WBR"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <p>{`The final step is to insert.`}</p>
        <p>{`For split pairs, the corner always goes directly above the target slot. So we do `}<code>U</code>{`. Then, insert by pulling the edge in along with the corner.`}</p>
        <CubeWrapper titles={["Example 2 — Insert pair"]}>
          <CubeScene
            scramble="x2 y' L2 B U' L U' B L B2 U B2 L2 U' L2 U L2 B2 U L2 B2 U2 R' U' R y R U R'"
            hints
            labels
            lines={[
              { moves: ["U", "R", "U", "R'"], durations: [1500, 1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WR", "WB", "WBR", "BR", "WGO", "GO", "BR", "BO", "WBO", "WBR"] }
            ]}
            progress
            startHighlighted
          />
        </CubeWrapper>
        <H1>Now what?</H1>
        <p>{`This isn't everything there is to F2L, but it's plenty for now. We'll cover more in future lessons. For now, spend a lot of time just getting used to the procedure. It will feel slow at first, but with practice, it becomes quite fast.`}</p>
        <p>{`You can do untimed solves to get used to everything. Timed solves help you to practice making quick decisions.`}</p>
        <p>
          {`If you get stuck on a case, you can try plugging it into the `}<LessonLink text="F2L tool on the Algs page" href="/algs?a=f2l" />{`. Some of the solutions you see will be more advanced than what this tutorial covers.`}
        </p>
        <p>
          {`You can also ask `}<LessonLink text="the community" href="/learn/how-to-learn/#finding-things-to-learn" />{`! People love talking about F2L cases.`}
        </p>
        <p>{`If you don't yet know OLL or PLL, it may be worth learning the two-look versions of both relatively soon, or whenever you get tired of practicing F2L.`}</p>

        <FurtherLearning sources={LINKS} />
      </LessonBody>
    </>
  );
}

const CENTERS: PieceName[] = ["W", "Y", "G", "R", "B", "O"];
const CROSS_PIECES: PieceName[] = [...CENTERS, "WB", "WG", "WO", "WR"];
const F2L_SLOTS_FACELETS = "YYYYYYYYY XWXWWWXWX BBBXBXXBX RRRXRXXRX GGGXGXXGX OOOXOXXOX";
const SLOT_PILL_WIDTH = 168;
const SLOT_PILL_HEIGHT = 44;
const SLOT_LABELS = [
  { text: "Back-left", anchor: { x: 292.2, y: 268.1 }, pill: { x: 150, y: 52 }, behindCube: true },
  { text: "Back-right", anchor: { x: 432.5, y: 304.9 }, pill: { x: 548, y: 96 }, behindCube: true },
  { text: "Front-left", anchor: { x: 179.9, y: 429.7 }, pill: { x: 96, y: 592 }, behindCube: false },
  { text: "Front-right", anchor: { x: 394.6, y: 476.4 }, pill: { x: 540, y: 592 }, behindCube: false },
];
const SLOT_LABEL_VIEW = `0 0 ${SCENE_PX} ${SCENE_PX}`;

type ScreenPoint = { x: number; y: number };

function SlotLeader({ anchor, pill }: { anchor: ScreenPoint; pill: ScreenPoint }) {
  return (
    <>
      <line x1={anchor.x} y1={anchor.y} x2={pill.x} y2={pill.y} strokeWidth={8} strokeLinecap="round" className="stroke-primary-900" />
      <line x1={anchor.x} y1={anchor.y} x2={pill.x} y2={pill.y} strokeWidth={3} className="stroke-dark_accent" />
    </>
  );
}

function F2LSlotsDiagram() {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-bold">The four F2L slots</span>
      <div className="relative w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
        <svg viewBox={SLOT_LABEL_VIEW} className="absolute inset-0 size-full">
          {SLOT_LABELS.filter((label) => label.behindCube).map((label) => (
            <SlotLeader key={label.text} {...label} />
          ))}
        </svg>
        <CubeImage
          facelets={F2L_SLOTS_FACELETS}
          highlight={["XX", "XXX"]}
          shade="#888888"
          labels
          dim={0.2}
          className="relative"
        />
        <svg viewBox={SLOT_LABEL_VIEW} className="absolute inset-0 size-full">
          {SLOT_LABELS.map((label) => (
            <g key={label.text}>
              {!label.behindCube && (
                <>
                  <SlotLeader {...label} />
                  <circle cx={label.anchor.x} cy={label.anchor.y} r={8} strokeWidth={3.5} className="fill-dark_accent stroke-primary-900" />
                </>
              )}
              <rect
                x={label.pill.x - SLOT_PILL_WIDTH / 2}
                y={label.pill.y - SLOT_PILL_HEIGHT / 2}
                width={SLOT_PILL_WIDTH}
                height={SLOT_PILL_HEIGHT}
                rx={SLOT_PILL_HEIGHT / 2}
                strokeWidth={2.5}
                className="fill-primary-800 stroke-dark_accent"
              />
              <text
                x={label.pill.x}
                y={label.pill.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={24}
                className="font-semibold fill-primary-100 select-none"
              >
                {label.text}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
const ARROW_DIAGRAM_HIGHLIGHT: PieceName[] = [...CROSS_PIECES, "XX", "XXX"];
const ARROWHEAD_PULLBACK = 16;
const SIDE_LINE_ANGLE = (30 * Math.PI) / 180;
const SIDE_LINE_DIRECTION = { x: -Math.sin(SIDE_LINE_ANGLE), y: Math.cos(SIDE_LINE_ANGLE) };
const SIDE_LINE_LENGTH = 56;
const SIDE_TEXT_DISTANCE = 88;

type ScenePoint = { x: number; y: number; z: number };
type ArrowDiagramProps = {
  id: string;
  facelets: string;
  angles: { x: number; y: number };
  from: ScenePoint;
  to: ScenePoint;
  textLabels: { text: string; x: number; y: number }[];
  sideLabels?: { text: string; anchor: ScenePoint }[];
  ariaLabel: string;
};

function projectToScene(angles: ArrowDiagramProps["angles"], point: ScenePoint) {
  const geometry = sceneGeometry(angles);
  const projected = apply(mul(geometry.projection, geometry.placement), point.x, point.y, point.z);
  return { x: projected.x / projected.w, y: projected.y / projected.w };
}

function DiagonalDiagram() {
  return (
    <ArrowDiagram
      id="diagonal-arrow"
      facelets="YYYYYYXYY XXXXWXXXX XGGGXGGGG OOOOXOOOO BBBBXXBBX RRXXXRXRR"
      angles={{ x: 30, y: -45 }}
      from={{ x: 0, y: 250, z: -100 }}
      to={{ x: 0, y: 50, z: 100 }}
      textLabels={[
        { text: "Target slot", x: 130, y: 480 },
        { text: "Corner here", x: 320, y: 245 },
      ]}
      ariaLabel="Grey target slot in the back-left. Arrow across the left face from the target slot to the top front-left corner."
    />
  );
}

function EdgeOppositeDiagram() {
  return (
    <ArrowDiagram
      id="edge-opposite-arrow"
      facelets="YYXXYYYYY WWWWWWWWW GGGGGGGGG OOXOOOOOO XBBBBBBBB RXRRRRRRR"
      angles={{ x: 55, y: 30 }}
      from={{ x: 250, y: 0, z: -100 }}
      to={{ x: 50, y: 0, z: -100 }}
      textLabels={[
        { text: "Corner here", x: 550, y: 160 },
        { text: "Edge opposite side", x: 150, y: 130 },
      ]}
      sideLabels={[
        { text: "Opposite side", anchor: { x: 0, y: 300, z: 150 } },
        { text: "Target side", anchor: { x: 300, y: 300, z: 150 } },
      ]}
      ariaLabel="Grey corner in the top back-right. Grey edge in the top left. Arrow across the top face from the back-right corner to the back-left corner. A line off the bottom-right corner of the cube labels the target side, and a line off the bottom-left corner labels the opposite side."
    />
  );
}

function ArrowDiagram({ id, facelets, angles, from, to, textLabels, sideLabels = [], ariaLabel }: ArrowDiagramProps) {
  const sideLeaders = sideLabels.map((label) => {
    const anchor = projectToScene(angles, label.anchor);
    return {
      text: label.text,
      anchor,
      end: {
        x: anchor.x + SIDE_LINE_DIRECTION.x * SIDE_LINE_LENGTH,
        y: anchor.y + SIDE_LINE_DIRECTION.y * SIDE_LINE_LENGTH,
      },
      textCenter: {
        x: anchor.x + SIDE_LINE_DIRECTION.x * SIDE_TEXT_DISTANCE,
        y: anchor.y + SIDE_LINE_DIRECTION.y * SIDE_TEXT_DISTANCE,
      },
    };
  });
  const allTextLabels = [
    ...textLabels,
    ...sideLeaders.map((leader) => ({ text: leader.text, ...leader.textCenter })),
  ];
  const start = projectToScene(angles, from);
  const tip = projectToScene(angles, to);
  const arrowLength = Math.hypot(tip.x - start.x, tip.y - start.y);
  const end = {
    x: tip.x - ((tip.x - start.x) / arrowLength) * ARROWHEAD_PULLBACK,
    y: tip.y - ((tip.y - start.y) / arrowLength) * ARROWHEAD_PULLBACK,
  };
  return (
    <div className="relative w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
      <CubeImage
        facelets={facelets}
        angles={angles}
        highlight={ARROW_DIAGRAM_HIGHLIGHT}
        shade="#888888"
        dim={0.25}
        className="relative"
      />
      <svg
        viewBox={SLOT_LABEL_VIEW}
        className="absolute inset-0 size-full"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <marker id={id} viewBox="0 0 6 6" refX={0} refY={3} markerWidth={3} markerHeight={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 z" className="fill-dark_accent stroke-primary-900" strokeWidth={0.6} />
          </marker>
        </defs>
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} strokeWidth={14} strokeLinecap="round" className="stroke-primary-900" />
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          strokeWidth={8}
          strokeLinecap="round"
          className="stroke-dark_accent"
          markerEnd={`url(#${id})`}
        />
      </svg>
      <CubeImage
        facelets={facelets}
        angles={angles}
        highlight={[]}
        dim={0}
        labels
        className="absolute inset-0 size-full"
      />
      <svg viewBox={SLOT_LABEL_VIEW} className="absolute inset-0 size-full">
        {sideLeaders.map((leader) => (
          <SlotLeader key={leader.text} anchor={leader.anchor} pill={leader.end} />
        ))}
        {allTextLabels.map((label) => (
          <text
            key={label.text}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={28}
            strokeWidth={6}
            paintOrder="stroke"
            className="font-semibold fill-primary-100 stroke-primary-900 select-none"
          >
            {label.text}
          </text>
        ))}
      </svg>
    </div>
  );
}

const F2L_PIECES: PieceName[] = [...CROSS_PIECES, "BO", "BR", "GO", "GR", "WBO", "WBR", "WGO", "WGR"];

function CrossToF2LDiagram() {
  return (
    <figure
      className="mb-6"
      role="img"
      aria-label="Cube with cross solved, then solve 4 F2L pairs, then cube with F2L solved."
    >
      <div className="flex flex-row items-center gap-2 sm:gap-4">
        <div className="min-w-0 flex-1 border border-neutral-400 rounded-sm overflow-hidden">
          <CubeImage
            labels
            scramble="z2 y'"
            highlight={CROSS_PIECES}
            shade="#888888"
            className="w-full h-auto"
            dim={0.3}
          />
        </div>
        <div className="flex w-20 shrink-0 flex-col items-center gap-1 sm:w-32">
          <span className="text-2xl font-bold leading-none text-primary-100 sm:text-4xl">4x</span>
          <div className="flex w-full items-center">
            <div className="h-0.5 flex-1 bg-dark_accent" />
            <div className="size-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-dark_accent" />
          </div>
          <span className="text-center text-xs text-primary-200 sm:text-sm">Solve 4 F2L pairs</span>
        </div>
        <div className="min-w-0 flex-1 border border-neutral-400 rounded-sm overflow-hidden">
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
    </figure>
  );
}

const FINDING_PIECES_FACELETS = "OGYRYRWOBGWWWWWWWOBBOYBYYBRWGBOROGRGRYBGGBYGGYBRYOROOR";
const FINDING_PIECES_HIGHLIGHT: PieceName[] = [...CROSS_PIECES, "BO", "WBO"];
const PAIR_PANEL_WIDTH = 600;
const PAIR_PANEL_HEIGHT = 440;
const CUBE_PLACEMENT: ScenePlacement = { x: -28, y: -40, scale: 0.385 };
const PAIR_PLACEMENT: ScenePlacement = { x: -1, y: -44, scale: 1 };
const PAIR_SCENE_CENTER: SceneSpot = [301, 294];
const PAIR_CIRCLE_SCENE_RADII = { x: 150, y: 110 };
const PAIR_TOP_TARGET = { x: 290, y: 150 };
const EDGE_ARROWS_BASE = { x: 252, y: 378 };
const CORNER_ARROWS_BASE = { x: 341, y: 378 };
const OTHER_COLORS_ARROWS: { start: ScreenPoint; edge: StickerEdge }[] = [
  { start: EDGE_ARROWS_BASE, edge: { from: [208.4, 327], to: [285.3, 351.1], at: 0.3 } },
  { start: EDGE_ARROWS_BASE, edge: { from: [203.8, 240.6], to: [284.9, 261.7], at: 0.7 } },
  { start: CORNER_ARROWS_BASE, edge: { from: [290.5, 352.8], to: [375.8, 379.5], at: 0.3 } },
  { start: CORNER_ARROWS_BASE, edge: { from: [290.4, 263.1], to: [380.9, 286.6], at: 0.7 } },
];
const WHITE_STICKER_EDGE: StickerEdge = { from: [427, 250.8], to: [421.2, 334.2], at: 0.5 };
const OTHER_COLORS_LABEL = { x: 300, y: 405 };
const CROSS_ICON = { x: 476, y: 200, size: 56 };
const CROSS_ICON_DESCRIPTOR = crossIcon(DEFAULT_SCENE_LOOK.colors.W, "#161018");
const ARROWHEAD_REACH = 12;
const STICKER_EDGE_GAP = 5;

type SceneSpot = [number, number];
type ScenePlacement = { x: number; y: number; scale: number };
type StickerEdge = { from: SceneSpot; to: SceneSpot; at: number };

function sceneToPanel(placement: ScenePlacement, [x, y]: SceneSpot) {
  return { x: placement.x + x * placement.scale, y: placement.y + y * placement.scale };
}

function arrowToStickerPath(start: ScreenPoint, { from, to, at }: StickerEdge) {
  const edgePoint = sceneToPanel(PAIR_PLACEMENT, [from[0] + (to[0] - from[0]) * at, from[1] + (to[1] - from[1]) * at]);
  const length = Math.hypot(edgePoint.x - start.x, edgePoint.y - start.y);
  const pullback = (ARROWHEAD_REACH + STICKER_EDGE_GAP) / length;
  const endX = edgePoint.x - (edgePoint.x - start.x) * pullback;
  const endY = edgePoint.y - (edgePoint.y - start.y) * pullback;
  return `M${start.x} ${start.y}L${endX} ${endY}`;
}

type PanelSize = { width: number; height: number };

const PAIR_PANEL: PanelSize = { width: PAIR_PANEL_WIDTH, height: PAIR_PANEL_HEIGHT };

function PanelPlacedCube({ placement, panel, ...image }: CubeImageProps & { placement: ScenePlacement; panel: PanelSize }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${(placement.x / panel.width) * 100}%`,
        top: `${(placement.y / panel.height) * 100}%`,
        width: `${((SCENE_PX * placement.scale) / panel.width) * 100}%`,
      }}
    >
      <CubeImage {...image} className="block w-full h-auto" />
    </div>
  );
}

function PanelLabel({ x, y, text, anchor = "middle" }: ScreenPoint & { text: ReactNode; anchor?: "start" | "middle" | "end" }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dy="0.35em"
      fontSize={28}
      strokeWidth={6}
      paintOrder="stroke"
      className="font-semibold fill-primary-100 stroke-primary-900 select-none"
    >
      {text}
    </text>
  );
}

function PanelArrowMarker({ id }: { id: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 6 6"
      refX={1}
      refY={3}
      markerWidth={3.5}
      markerHeight={3.5}
      orient="auto"
      overflow="visible"
    >
      <path
        d="M0,0 L6,3 L0,6 z"
        strokeWidth={2.1}
        strokeLinejoin="round"
        paintOrder="stroke"
        className="fill-dark_accent stroke-primary-900"
      />
    </marker>
  );
}

function PanelArrow({ d, markerId }: { d: string; markerId: string }) {
  return (
    <>
      <path d={d} fill="none" strokeWidth={9} strokeLinecap="round" className="stroke-primary-900" />
      <path
        d={d}
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
        className="stroke-dark_accent"
        markerEnd={`url(#${markerId})`}
      />
    </>
  );
}

function PairColorsDiagram() {
  const circleCenter = sceneToPanel(CUBE_PLACEMENT, PAIR_SCENE_CENTER);
  const circleRadii = {
    x: PAIR_CIRCLE_SCENE_RADII.x * CUBE_PLACEMENT.scale,
    y: PAIR_CIRCLE_SCENE_RADII.y * CUBE_PLACEMENT.scale,
  };
  const circleRight = { x: circleCenter.x + circleRadii.x, y: circleCenter.y };
  const pairArrowEndY = PAIR_TOP_TARGET.y - ARROWHEAD_REACH;
  const pairArrowPath = `M${circleRight.x} ${circleRight.y}C${circleRight.x + 90} ${circleRight.y} ${PAIR_TOP_TARGET.x} ${pairArrowEndY - 80} ${PAIR_TOP_TARGET.x} ${pairArrowEndY}`;
  const crossArrowStart = { x: CROSS_ICON.x - 8, y: CROSS_ICON.y + CROSS_ICON.size / 2 };
  const crossArrowPath = arrowToStickerPath(crossArrowStart, WHITE_STICKER_EDGE);
  return (
    <figure
      className="relative w-full max-w-lg mb-6 border border-neutral-400 rounded-sm overflow-hidden"
      style={{ aspectRatio: `${PAIR_PANEL_WIDTH} / ${PAIR_PANEL_HEIGHT}` }}
      role="img"
      aria-label="Cube with white cross solved. The orange-blue-white corner and orange-blue edge are circled. An arrow points from the circle to the two pieces drawn alone. A cross icon labeled Cross points to the white sticker on the corner. The label Two other colors points to the orange and blue stickers on both pieces."
    >
      <PanelPlacedCube placement={CUBE_PLACEMENT} panel={PAIR_PANEL} facelets={FINDING_PIECES_FACELETS} highlight={FINDING_PIECES_HIGHLIGHT} />
      <PanelPlacedCube placement={PAIR_PLACEMENT} panel={PAIR_PANEL} facelets={FINDING_PIECES_FACELETS} highlight={["BO", "WBO"]} dim={0} />
      <svg viewBox={`0 0 ${PAIR_PANEL_WIDTH} ${PAIR_PANEL_HEIGHT}`} className="absolute inset-0 size-full">
        <defs>
          <PanelArrowMarker id="pair-colors-arrow" />
        </defs>
        <PanelArrow d={pairArrowPath} markerId="pair-colors-arrow" />
        <ellipse cx={circleCenter.x} cy={circleCenter.y} rx={circleRadii.x} ry={circleRadii.y} fill="none" strokeWidth={9} className="stroke-primary-900" />
        <ellipse cx={circleCenter.x} cy={circleCenter.y} rx={circleRadii.x} ry={circleRadii.y} fill="none" strokeWidth={4} className="stroke-dark_accent" />
        {OTHER_COLORS_ARROWS.map(({ start, edge }) => (
          <PanelArrow key={edge.from.join()} d={arrowToStickerPath(start, edge)} markerId="pair-colors-arrow" />
        ))}
        <PanelArrow d={crossArrowPath} markerId="pair-colors-arrow" />
        <PanelLabel {...OTHER_COLORS_LABEL} text="Two other colors" />
        <PanelLabel x={CROSS_ICON.x + CROSS_ICON.size / 2} y={CROSS_ICON.y + CROSS_ICON.size + 24} text="Cross" />
        <svg
          x={CROSS_ICON.x}
          y={CROSS_ICON.y}
          width={CROSS_ICON.size}
          height={CROSS_ICON.size}
          viewBox={CROSS_ICON_DESCRIPTOR.viewBox}
          stroke="#52525b"
          strokeWidth={1}
        >
          {CROSS_ICON_DESCRIPTOR.shapes.map((shape, i) => shape.type === "rect" && (
            <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} />
          ))}
        </svg>
      </svg>
    </figure>
  );
}

const GOOD_EDGE_FACELETS = "BGBGYYYRGYWRWWWRWYOBWOOOROBOBWBBRYBBRYOYRGORGWRGOGYWGG";
const GOOD_EDGE_HIGHLIGHT: PieceName[] = [...CROSS_PIECES, "BR"];
const GOOD_EDGE_PANEL: PanelSize = { width: 600, height: 540 };
const GOOD_EDGE_PLACEMENT: ScenePlacement = { x: -20, y: -100, scale: 1 };
const TOP_STICKER_LEFT_EDGE: SceneSpot = [272, 239];
const SIDE_STICKER_RIGHT_EDGE: SceneSpot = [370, 308];
const GOOD_EDGE_ANGLES = { x: 30, y: 0 };
const GOOD_EDGE_LABEL_X = { left: 75, right: 525 };
const GOOD_EDGE_SWATCH_SIZE = 64;
const GOOD_EDGE_SWATCH_TOP = 356;
const SWATCH_ARROW_GAP = 8;
const GOOD_EDGE_SWATCHES = [
  {
    text: "Left",
    x: GOOD_EDGE_LABEL_X.left,
    color: DEFAULT_SCENE_LOOK.colors.G,
    side: 1,
    centerFrontEdge: { x: 0, y: 150, z: 50 },
    curveControl: { x: 130, y: 300 },
  },
  {
    text: "Right",
    x: GOOD_EDGE_LABEL_X.right,
    color: DEFAULT_SCENE_LOOK.colors.B,
    side: -1,
    centerFrontEdge: { x: 300, y: 150, z: 50 },
    curveControl: { x: 470, y: 300 },
  },
];
const CAPTION_Y = 492;
const CAPTION_ARROW = { startX: 427, endX: 483 };
const CAPTION_TEXT_GAP = 12;
const GOOD_BOX = { left: CAPTION_ARROW.endX + 4, padding: 10, fontSize: 28, border: 2.5, radius: 8 };

function panelUnits(size: number) {
  return `${(size / GOOD_EDGE_PANEL.width) * 100}cqw`;
}

function curvedArrowToPoint(start: ScreenPoint, control: ScreenPoint, tip: ScreenPoint) {
  const length = Math.hypot(tip.x - control.x, tip.y - control.y);
  const endX = tip.x - ((tip.x - control.x) / length) * ARROWHEAD_REACH;
  const endY = tip.y - ((tip.y - control.y) / length) * ARROWHEAD_REACH;
  return `M${start.x} ${start.y}Q${control.x} ${control.y} ${endX} ${endY}`;
}

function GoodEdgeDiagram() {
  const arrowGap = ARROWHEAD_REACH + STICKER_EDGE_GAP;
  const topSticker = sceneToPanel(GOOD_EDGE_PLACEMENT, TOP_STICKER_LEFT_EDGE);
  const sideSticker = sceneToPanel(GOOD_EDGE_PLACEMENT, SIDE_STICKER_RIGHT_EDGE);
  const topArrowPath = `M${GOOD_EDGE_LABEL_X.left} 96Q${GOOD_EDGE_LABEL_X.left} ${topSticker.y} ${topSticker.x - arrowGap} ${topSticker.y}`;
  const sideArrowPath = `M${GOOD_EDGE_LABEL_X.right} 96Q${GOOD_EDGE_LABEL_X.right} ${sideSticker.y} ${sideSticker.x + arrowGap} ${sideSticker.y}`;
  const swatchMidY = GOOD_EDGE_SWATCH_TOP + GOOD_EDGE_SWATCH_SIZE / 2;
  const centerArrowPaths = GOOD_EDGE_SWATCHES.map((swatch) => {
    const start = { x: swatch.x + swatch.side * (GOOD_EDGE_SWATCH_SIZE / 2 + SWATCH_ARROW_GAP), y: swatchMidY };
    const projected = projectToScene(GOOD_EDGE_ANGLES, swatch.centerFrontEdge);
    const tip = sceneToPanel(GOOD_EDGE_PLACEMENT, [projected.x, projected.y]);
    return curvedArrowToPoint(start, swatch.curveControl, tip);
  });
  const captionArrowPath = `M${CAPTION_ARROW.startX} ${CAPTION_Y}L${CAPTION_ARROW.endX - ARROWHEAD_REACH} ${CAPTION_Y}`;
  return (
    <figure
      className="w-full max-w-sm mb-6 p-4 border border-neutral-400 rounded-sm overflow-hidden"
      role="img"
      aria-label="Cube with a red and blue edge in the top front. An arrow labeled Top sticker points to the red sticker on top. An arrow labeled Side sticker points to the blue sticker on the front. The left center is green and the right center is blue. Good means the side sticker matches the left or right center."
    >
      <div
        className="@container relative w-full"
        style={{ aspectRatio: `${GOOD_EDGE_PANEL.width} / ${GOOD_EDGE_PANEL.height}` }}
      >
        <PanelPlacedCube
          placement={GOOD_EDGE_PLACEMENT}
          panel={GOOD_EDGE_PANEL}
          facelets={GOOD_EDGE_FACELETS}
          angles={GOOD_EDGE_ANGLES}
          labels
          highlight={GOOD_EDGE_HIGHLIGHT}
        />
        <svg viewBox={`0 0 ${GOOD_EDGE_PANEL.width} ${GOOD_EDGE_PANEL.height}`} className="absolute inset-0 size-full">
          <defs>
            <PanelArrowMarker id="good-edge-arrow" />
          </defs>
          <PanelArrow d={topArrowPath} markerId="good-edge-arrow" />
          <PanelArrow d={sideArrowPath} markerId="good-edge-arrow" />
          {centerArrowPaths.map((path) => (
            <PanelArrow key={path} d={path} markerId="good-edge-arrow" />
          ))}
          <PanelArrow d={captionArrowPath} markerId="good-edge-arrow" />
          <PanelLabel x={GOOD_EDGE_LABEL_X.left} y={36} text="Top" />
          <PanelLabel x={GOOD_EDGE_LABEL_X.left} y={68} text="sticker" />
          <PanelLabel x={GOOD_EDGE_LABEL_X.right} y={36} text="Side" />
          <PanelLabel x={GOOD_EDGE_LABEL_X.right} y={68} text="sticker" />
          {GOOD_EDGE_SWATCHES.map((swatch) => (
            <g key={swatch.text}>
              <PanelLabel x={swatch.x} y={330} text={swatch.text} />
              <rect
                x={swatch.x - GOOD_EDGE_SWATCH_SIZE / 2}
                y={GOOD_EDGE_SWATCH_TOP}
                width={GOOD_EDGE_SWATCH_SIZE}
                height={GOOD_EDGE_SWATCH_SIZE}
                rx={6}
                fill={swatch.color}
                strokeWidth={3}
                className="stroke-primary-900"
              />
            </g>
          ))}
          <PanelLabel x={CAPTION_ARROW.startX - CAPTION_TEXT_GAP} y={CAPTION_Y} anchor="end" text={
            <>
              <tspan fill={DEFAULT_SCENE_LOOK.colors.B}>Side</tspan>
              {" matches "}
              <tspan fill={DEFAULT_SCENE_LOOK.colors.G}>Left</tspan>
              {" or "}
              <tspan fill={DEFAULT_SCENE_LOOK.colors.B}>Right</tspan>
            </>
          } />
        </svg>
        <span
          className="absolute -translate-y-1/2 border-solid border-dark_accent bg-primary-800 font-semibold leading-[0.7] text-primary-100 select-none"
          style={{
            left: `${(GOOD_BOX.left / GOOD_EDGE_PANEL.width) * 100}%`,
            top: `${(CAPTION_Y / GOOD_EDGE_PANEL.height) * 100}%`,
            fontSize: panelUnits(GOOD_BOX.fontSize),
            padding: panelUnits(GOOD_BOX.padding),
            borderWidth: panelUnits(GOOD_BOX.border),
            borderRadius: panelUnits(GOOD_BOX.radius),
          }}
        >
          Good
        </span>
      </div>
    </figure>
  );
}

const LEVEL_2_CASE_GROUPS = [
  {
    goal: "Make connected pair",
    cases: [
      { title: "Cross color on top of corner", facelets: "BGBYYRWYRGWYWWWGWWBBWBOYWOOGBRRBRGBOYOYGRGBRROORYGOYGO", steps: [
        "Hide edge",
        "Get corner on top of edge",
        "Un-hide edge"
      ] as string[] },
      { title: "Top colors match", facelets: "YYBRYRRYYGWYWWWWWRWGRBOYWOOGBORBGGBBWBOOROYRRBGBYGOGGO", steps: [
        "Hide corner",
        "Place edge by corner",
        "Un-hide corner",
      ] as string[] },
    ],
  },
  {
    goal: "Make split pair",
    cases: [
      { title: "Top colors different", facelets: "WYORYRBYBGWYWWWGWYRORBOYWOOYBWRBGGBBBBGORGORRRGWYGOYGO", steps: [
        "Hide corner",
        "Place edge opposite corner",
        "Unhide corner",
      ] as string[] },
    ],
  },
];

function Level2CasesDiagram({ withInstructions = false }: { withInstructions?: boolean }) {
  const groupRowSpan = withInstructions ? "row-span-4" : "row-span-3";
  const caseRowSpan = withInstructions ? "row-span-3" : "row-span-2";
  return (
    <figure
      className="@container mb-6"
      {...(!withInstructions && {
        role: "img",
        "aria-label": "Three Level 2 cases. Cross color on top of corner and top colors match make a connected pair. Top colors different makes a split pair.",
      })}
    >
      <div className="grid grid-cols-2 gap-4 @min-[30rem]:grid-cols-3">
        {LEVEL_2_CASE_GROUPS.map((group) => (
          <div
            key={group.goal}
            className={`grid grid-cols-subgrid grid-rows-subgrid gap-y-1.5 ${groupRowSpan} ${group.cases.length > 1 ? "col-span-2" : ""}`}
          >
            <div className={`col-span-full grid grid-cols-subgrid grid-rows-subgrid gap-x-2 gap-y-1 rounded-[11px] border-[1.5px] border-dark_accent p-2 ${caseRowSpan}`}>
              {group.cases.map((levelCase) => (
                <div
                  key={levelCase.title}
                  className={`grid grid-rows-subgrid gap-1 rounded-[9px] border-[1.5px] border-primary-500 bg-primary-700 px-2 py-1.5 ${caseRowSpan}`}
                >
                  <span className="text-sm text-primary-200">{levelCase.title}</span>
                  <CubeImage
                    facelets={levelCase.facelets}
                    shade="#888888"
                    hints
                    dim={1}
                    highlight={["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WBR", "BR"]}
                    className="aspect-square w-full"
                  />
                  {withInstructions && (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-primary-200">How to solve:</span>
                      <ol className="list-inside list-decimal font-bold text-sm text-neutral-400 leading-relaxed space-y-1">
                        {levelCase.steps.map((step) => (
                          <li key={step}><span className="font-normal">{step}</span></li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span className="col-span-full justify-self-center text-sm font-bold text-primary-100">{group.goal}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

const TREE_EXAMPLE_SCRAMBLE ="U L' F2 R2 D' R B' U' F D2 R' F2 U2 B2 R' F2 U2 R' B2 R2 D2 x2 F' R B U L2 y2";
const TREE_EXAMPLE_STEPS = ["R U' R' y2", "y'", "R' U R", "U' R' U2 R", "U R' U2 R"];
const TREE_EXAMPLE_HIGHLIGHT: PieceName[] = [...CROSS_PIECES, "BR", "WBR"];
const TREE_LINK_CLASS = "text-primary-400 underline underline-offset-4 hover:text-primary-300 transition-colors";
const LEVEL_DESCRIPTIONS = [
  "Pieces solved",
  <span key="paired">
    {"Pieces "}
    <a href="#level-1-are-the-pieces-paired" className={TREE_LINK_CLASS}>paired</a>
    {" in the top layer"}
  </span>,
  "Pieces separated in the top layer",
  "Pieces adjacent in the top layer",
  <span key="bad">
    {`Edge is `}
    <a href="#level-4-is-the-edge-bad" className={TREE_LINK_CLASS}>bad</a>
  </span>,
  "F2L piece(s) stuck in the bottom or middle layer",
];

type TreeNode = { x: number; parent: number };

const TREE_CHILD_COUNTS = [3, 2, 2, 2, 2];
const TREE_SIBLING_GAPS = [0.28, 0.16, 0.1, 0.06, 0.035];
const TREE_PATH_CHOICES = [0, 1, 0, 1, 0];
const TREE_TRUNK_X = 0.48;
const TOP_LEVEL = TREE_CHILD_COUNTS.length;
const TREE_VIEW_WIDTH = 300;
const TREE_BRANCH_COLOR = "#5c4330";
const TREE_PATH_COLOR = "#c49a6c";
const NARROW_CUBE_FRACTION = 0.5;
const WIDE_CUBE_FRACTION = 0.3;
const TREE_CELL_HEIGHT_RATIO = 1.25;
const TREE_ARROW_GAP = 8;

function seededOffset(seed: number) {
  return ((seed * 9301 + 49297) % 233280) / 233280 - 0.5;
}

function buildTreeLevels() {
  const levels: TreeNode[][] = [[{ x: TREE_TRUNK_X, parent: -1 }]];
  TREE_CHILD_COUNTS.forEach((childCount, index) => {
    const gap = TREE_SIBLING_GAPS[index];
    const children = levels[index].flatMap((parentNode, parent) =>
      Array.from({ length: childCount }, (_, child) => {
        const siblingOffset = (child - (childCount - 1) / 2) * gap;
        const jitter = seededOffset((index + 1) * 1000 + parent * childCount + child) * 0.6 * gap;
        const x = parentNode.x + siblingOffset + jitter;
        return { x: Math.min(0.98, Math.max(0.02, x)), parent };
      })
    );
    levels.push(children);
  });
  return levels;
}

const TREE_LEVELS = buildTreeLevels();

function findPathNodes() {
  const nodes = [0];
  TREE_PATH_CHOICES.forEach((choice, index) => {
    nodes.push(nodes[index] * TREE_CHILD_COUNTS[index] + choice);
  });
  return nodes;
}

function branchWidth(level: number) {
  return 1.5 + (TOP_LEVEL - level) * 1.2;
}

function arrowSize(level: number) {
  return 6 + branchWidth(level) * 1.8;
}

function branchPath(fromX: number, fromY: number, toX: number, toY: number) {
  const midY = (fromY + toY) / 2;
  return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
}

type Point = [number, number];

const OAK_LEAF_SINUSES: Point[] = [[1.5, -3], [3, -11], [4, -20], [3.5, -29], [2, -36], [0, -42]];
const OAK_LEAF_LOBES: Point[] = [[7, -7], [10, -15.5], [10.5, -24.5], [8, -32.5], [4, -39]];
const OAK_LEAF_COLOR = "#5f7a3a";
const OAK_LEAF_VEIN_COLOR = "#3f5426";
const OAK_LEAVES = [
  { level: TOP_LEVEL, node: 3, rotation: -40, scale: 0.65 },
  { level: TOP_LEVEL, node: 7, rotation: -120, scale: 0.5 },
  { level: TOP_LEVEL, node: 9, rotation: -30, scale: 0.55 },
  { level: TOP_LEVEL, node: 14, rotation: 35, scale: 0.6 },
  { level: TOP_LEVEL, node: 30, rotation: 140, scale: 0.6 },
  { level: TOP_LEVEL - 1, node: 8, rotation: -30, scale: 0.55 },
  { level: TOP_LEVEL - 2, node: 1, rotation: -60, scale: 0.6 },
];

function lobeCurve(from: Point, lobe: Point, to: Point) {
  const controlX = (8 * lobe[0] - from[0] - to[0]) / 6;
  return `C ${controlX} ${from[1] - 1}, ${controlX} ${to[1] - 1}, ${to[0]} ${to[1]}`;
}

function buildOakLeafOutline() {
  const mirror = ([x, y]: Point): Point => [-x, y];
  const rightSide = OAK_LEAF_LOBES.map((lobe, index) =>
    lobeCurve(OAK_LEAF_SINUSES[index], lobe, OAK_LEAF_SINUSES[index + 1])
  );
  const leftSide = OAK_LEAF_LOBES.map((lobe, index) =>
    lobeCurve(mirror(OAK_LEAF_SINUSES[index + 1]), mirror(lobe), mirror(OAK_LEAF_SINUSES[index]))
  ).reverse();
  const [startX, startY] = OAK_LEAF_SINUSES[0];
  return `M ${startX} ${startY} ${rightSide.join(" ")} ${leftSide.join(" ")} Z`;
}

const OAK_LEAF_OUTLINE = buildOakLeafOutline();

function OakLeaf({ x, y, rotation, scale }: { x: number; y: number; rotation: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}>
      <path d={OAK_LEAF_OUTLINE} fill={OAK_LEAF_COLOR} />
      <path d="M 0 4 L 0 -38" stroke={OAK_LEAF_VEIN_COLOR} strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

function F2LTreeLayer({ cubeFraction, markerId, className }: { cubeFraction: number; markerId: string; className: string }) {
  const cubeSize = TREE_VIEW_WIDTH * cubeFraction;
  const rowHeight = cubeSize * TREE_CELL_HEIGHT_RATIO;
  const height = rowHeight * TREE_LEVELS.length;
  const levelY = (level: number) => rowHeight * (TOP_LEVEL - level) + cubeSize / 2;
  const toX = (fraction: number) => fraction * TREE_VIEW_WIDTH;
  const cubeColumnX = toX(1 - cubeFraction);
  const trunkX = toX(TREE_TRUNK_X);
  const pathXs = findPathNodes().map((node, level) => toX(TREE_LEVELS[level][node].x));

  return (
    <svg
      viewBox={`0 0 ${TREE_VIEW_WIDTH} ${height}`}
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    >
      <defs>
        {TREE_LEVELS.slice(1).map((_, index) => {
          const level = index + 1;
          return (
            <marker
              key={level}
              id={`${markerId}-${level}`}
              viewBox="0 0 6 6"
              refX={0}
              refY={3}
              markerWidth={arrowSize(level)}
              markerHeight={arrowSize(level)}
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 z" fill={TREE_PATH_COLOR} />
            </marker>
          );
        })}
      </defs>
      <path
        d={`M ${trunkX} ${levelY(0)} L ${trunkX} ${height}`}
        stroke={TREE_BRANCH_COLOR}
        strokeWidth={10}
        strokeLinecap="round"
      />
      {TREE_LEVELS.slice(1).map((nodes, index) => {
        const level = index + 1;
        const parents = TREE_LEVELS[level - 1];
        return nodes.map((node, nodeIndex) => (
          <path
            key={`${level}-${nodeIndex}`}
            d={branchPath(toX(node.x), levelY(level), toX(parents[node.parent].x), levelY(level - 1))}
            fill="none"
            stroke={TREE_BRANCH_COLOR}
            strokeWidth={branchWidth(level)}
            strokeLinecap="round"
          />
        ));
      })}
      {TREE_LEVELS.map((nodes, level) =>
        nodes.map((node, nodeIndex) => (
          <circle key={`${level}-${nodeIndex}`} cx={toX(node.x)} cy={levelY(level)} r={2.5} fill={TREE_BRANCH_COLOR} />
        ))
      )}
      {OAK_LEAVES.map((leaf) => (
        <OakLeaf
          key={`${leaf.level}-${leaf.node}`}
          x={toX(TREE_LEVELS[leaf.level][leaf.node].x)}
          y={levelY(leaf.level)}
          rotation={leaf.rotation}
          scale={leaf.scale}
        />
      ))}
      {pathXs.map((x, level) => (
        <line
          key={level}
          x1={x}
          y1={levelY(level)}
          x2={cubeColumnX}
          y2={levelY(level)}
          stroke={TREE_PATH_COLOR}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      ))}
      {pathXs.slice(1).map((x, index) => {
        const level = index + 1;
        return (
          <path
            key={level}
            d={branchPath(
              x,
              levelY(level) + TREE_ARROW_GAP,
              pathXs[level - 1],
              levelY(level - 1) - TREE_ARROW_GAP - arrowSize(level)
            )}
            fill="none"
            stroke={TREE_PATH_COLOR}
            strokeWidth={branchWidth(level)}
            markerEnd={`url(#${markerId}-${level})`}
          />
        );
      })}
      {pathXs.map((x, level) => (
        <circle key={level} cx={x} cy={levelY(level)} r={4} fill={TREE_PATH_COLOR} />
      ))}
    </svg>
  );
}

function F2LTreeDiagram() {
  const examples = TREE_LEVELS.map((_, level) => {
    const stepsDone = TOP_LEVEL - level;
    return {
      level,
      scramble: [TREE_EXAMPLE_SCRAMBLE, ...TREE_EXAMPLE_STEPS.slice(0, stepsDone)].join(" "),
    };
  }).reverse();

  return (
    <figure
      className="relative mb-6"
      role="img"
      aria-label="A tree of F2L cases. One path descends from level 5 at the top to level 0 at the bottom, with an example cube beside each level."
      style={{ "--narrow-cubes": `${NARROW_CUBE_FRACTION * 100}%`, "--wide-cubes": `${WIDE_CUBE_FRACTION * 100}%` } as React.CSSProperties}
    >
      <F2LTreeLayer cubeFraction={NARROW_CUBE_FRACTION} markerId="f2l-tree-arrow-narrow" className="sm:hidden" />
      <F2LTreeLayer cubeFraction={WIDE_CUBE_FRACTION} markerId="f2l-tree-arrow-wide" className="hidden sm:block" />
      <div className="relative ml-auto flex w-(--narrow-cubes) flex-col sm:w-(--wide-cubes)">
        {examples.map(({ level, scramble }) => (
          <div key={level} className="p-1" style={{ aspectRatio: `1 / ${TREE_CELL_HEIGHT_RATIO}` }}>
            <div className="flex h-full flex-col border border-neutral-400 rounded-sm overflow-hidden bg-primary-900">
              <div className="relative aspect-square overflow-hidden">
                <CubeImage
                  scramble={scramble}
                  labels
                  highlight={TREE_EXAMPLE_HIGHLIGHT}
                  className="m-[-12.5%] block aspect-square w-[125%] max-w-none"
                />
                <span className="absolute top-1 left-1.5 text-xs font-bold text-primary-100">
                  {`Level ${level}`}
                </span>
              </div>
              <span className="flex flex-1 items-center justify-center px-1.5 pb-1 text-center text-sm leading-tight text-primary-200">
                {LEVEL_DESCRIPTIONS[level]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

const LEVEL_QUESTIONS = [
  { level: 5, question: "Are pieces in the bottom or middle layer?" },
  { level: 4, question: "Is the edge bad?" },
  { level: 3, question: "Are the pieces adjacent?" },
  { level: 2, question: "Are the pieces separated?" },
  { level: 1, question: "Are the pieces paired?" },
  { level: 0, question: "Is the pair solved?" },
];

function LevelQuestionsDiagram() {
  return (
    <figure
      className="mb-6"
      role="img"
      aria-label={LEVEL_QUESTIONS.map(({ level, question }) => `${question} If yes, Level ${level}.`).join(" If no: ")}
    >
      <div className="flex max-w-md flex-col gap-7">
        {LEVEL_QUESTIONS.map(({ level, question }, index) => (
          <div key={level} className="flex">
            <div className="relative flex flex-1 items-center rounded-[9px] border-[1.5px] border-primary-500 bg-primary-700 px-2 py-1 text-sm text-primary-200">
              {question}
              {index < LEVEL_QUESTIONS.length - 1 && (
                <div className="absolute top-full left-1/2 flex h-7 -translate-x-1/2 flex-col items-center py-1">
                  <div className="w-0.5 flex-1 bg-dark_accent" />
                  <div className="size-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-dark_accent" />
                  <span className="absolute top-1/2 left-full ml-2 -translate-y-1/2 text-xs font-bold text-primary-100">No</span>
                </div>
              )}
            </div>
            <div className="relative flex w-12 items-center px-1">
              <span className="absolute inset-x-0 bottom-1/2 text-center text-xs font-bold text-primary-100">Yes</span>
              <div className="h-0.5 flex-1 bg-dark_accent" />
              <div className="size-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-dark_accent" />
            </div>
            <div className="flex items-center rounded-[9px] border-[1.5px] border-primary-500 bg-primary-700 px-2 py-1 text-sm font-bold whitespace-nowrap text-primary-100">
              {`Level ${level}`}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
