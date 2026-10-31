import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";
import Story from "../LessonStory";
import LessonLink from "../LessonLink";
import LessonList from "../LessonList";
import CubeScene from "../CubeScene";
import CubeImage from "../CubeImage";
import { SCENE_PX, apply, mul, sceneGeometry } from "../../../utils/cubeSvgRender";
import { H1, H2, H3 } from "../LessonHeading";
import type { PieceName } from "../cubeProps";
import FurtherLearning, { Citation, type Source } from "../FurtherLearning";

const SOURCES = [
  {
    id: "cubehead-f2l-cases",
    title: "All Standard F2L Cases",
    attribution: "by CubeHead",
    href: "https://youtu.be/3tYj-9f4dA0",
  },
  {
    id: "jperm-f2l",
    title: "Short F2L tutorial",
    attribution: "by J Perm",
    href: "https://youtu.be/Ar_Zit1VLG0",
  },
  {
    id: "rishi-f2l-hunting",
    title: "Hunting Story for F2L",
    attribution: "by RiDo",
    href: "https://youtu.be/WB5apB2i_Do",
  },
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
        <p>{`First Two Layers (F2L) is like a tree with many branches.`}</p>
        <p>{`Some beginner tutorials simplify F2L to having only three basic cases that you need to be able to solve. You may sometimes hear there are 41 cases. The truth is that the full tree has hundreds of cases.`}</p>
        <p>{`It is not possible to memorize all these cases at once. We simplify at first so that you can at least solve F2L. You can learn more details over time, which makes you faster and more efficient. If F2L is like an enormous tree, then over weeks and months, you learn to descend the branches on the fastest path.`}</p>
        <p>
          <LessonLink text="As we've learned" href="/learn/what-to-learn/#f2l" />
          {`, you solve four corner-and-edge pairs. So it is like we descend the tree four times.`}
        </p>
        <CrossToF2LDiagram />
        <p>
          {`To start F2L, `}<LessonLink text="cross" href="/learn/better-cross/" />
          {` should already be solved on the bottom of your cube. Except for brief moments, cross should stay solved during F2L.`}
        </p>
        <H1>Finding F2L pieces</H1>
        <p>{`The first step is always to find an F2L pair to solve. We need to find one corner piece and one edge piece.`}</p>
        <H2>Find a corner</H2>
        <p>{`You can tell which corners get solved during F2L by looking for a corner that has your cross color. If you solved white cross, then you should look for a corner piece with white on it.`}</p>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold">The four corner pieces of F2L (white cross)</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeImage
              facelets="ROOOYOWYWYWOWWWOWBRRBGBYRBYOYYGRBBRYGGBYGRRGWWBGBORGOG"
              hints
              angles={{ x: 30, y: 210 }}
              highlight={["WGR", "WGO", "WBO", "WBR"]}
            />
          </div>
        </div>
        <H2>Find the corresponding edge</H2>
        <p>{`Corner pieces have three colors on them. Each F2L corner has one color which is the cross color, but then there's the other two. Those two other colors are the colors of the edge that we need.`}</p>
        <div className="flex flex-col gap-1 pb-6">
          <span className="text-sm font-bold">The four edge pieces of F2L (white cross)</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeImage
              facelets="ROOOYOWYWYWOWWWOWBRRBGBYRBYOYYGRBBRYGGBYGRRGWWBGBORGOG"
              hints
              angles={{ x: 30, y: 210 }}
              highlight={["BR", "BO", "GO", "GR"]}
            />
          </div>
        </div>
        <p>{`None of these pieces have white or yellow on them. F2L edges will never have the cross color on them, or the color that is opposite cross on them.`}</p>
        <H2>Finding pieces example</H2>
        <p>{`White cross was solved, so we need to find a corner piece with white on it. The first place to look for corner pieces is the top layer, but they may be in the bottom layer next to cross.`}</p>
        <p>{`Here we find the red-blue-white corner piece in the top layer. That means we need to find the red-blue edge. Edges could be in the top or middle layer, and here we found it in the middle layer.`}</p>
        <div className="flex flex-col gap-1 pb-6">
          <span className="text-sm font-bold">One corner and one edge</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeImage
              facelets="ROOOYOWYWYWOWWWOWBRRBGBYRBYOYYGRBBRYGGBYGRRGWWBGBORGOG"
              hints
              angles={{ x: 30, y: 210 }}
              highlight={["BR", "WBR", "WB", "WG", "WO", "WR", "W"]}
            />
          </div>
        </div>
        <H1>Tree overview</H1>
        <p>{`Now that we have two F2L pieces to solve, the next step is to figure out how close they are to being solved. In our tree analogy, it's like we're figuring out how high up in the tree we are. Then we take branches down towards the bottom.`}</p>
        <p>{`After this overview, we'll talk about how to actually descend the tree, step-by-step.`}</p>

        {/* TODO: draw a scampering squirrel (real artist) */}
        {/* TODO: draw a sword in the ground */}
        <F2LTreeDiagram />

        <p>{`The fastest way down the tree is skipping as many of these levels as possible. But the fastest way is hard to find, and you wouldn't see familiar branches very often. So to begin, you stop at several levels.`}</p>
        <p>{`Our next goal is to figure out what level you're on at any given time. Think of this like identifying the problem that we need to answer. We need to know what level we're on so that we can continue solving the pair.`}</p>

        <H1>Finding your place in the tree</H1>
        <p>{`We can figure out which level you're at by asking some basic questions. We ask in order from Level 5 to Level 0. `}<b>{`If the answer is yes, that is the level you are on.`}</b></p>
        
        <H2>Level 5 — Are pieces in the bottom or middle layer?</H2>
        <div className="flex flex-col items-center gap-x-8 sm:flex-row sm:items-start pb-6">
          <div className="flex-1">
            <p>{`If there are pieces in the F2L pair that are not both in the top layer, you're at this level.`}</p>
            <p>{`Even if a piece is in the right spot and solved correctly, you're at this level unless both pieces are solved. Naturally, if both pieces are solved, you're done here!`}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">F2L pieces in bottom and middle</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                facelets="YGROYRROOYWBWWWGWRBYGBBBGBWWYBORYORGWYOBGRWGRBGYGORYOO"
                angles={{ x: -30, y: 30 }}
                labels
                highlight={["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WBO", "BO"]}
                />
            </div>
          </div>
        </div>
        <p>{`In the example above, both F2L pieces are in the bottom or middle layer. The edge is solved, but the corner isn't, so this is a Level 5 case.`}</p>
        <p>{`If the pieces are both in the top layer, we continue to the Level 4 question.`}</p>

        <H2>Level 4 — Is the edge bad?</H2>
        <p>{`Once we have both pieces into the top layer, we need to determine if the F2L edge is "good" or "bad". Basically, edges are good when they can be solved with `}<code>R</code>{', '}<code>L</code>{', '}<code>U</code>{', and '}<code>D</code> moves.</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Good edge</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="R U"
                hints
                labels
                lines={[
                  { moves: ["U'", "R'"], durations: [1500, 1500], delay: 500, highlight: [...CENTERS, "GR"] }
                ]}
                progress
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Bad edge</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="R' F R F'"
                hints
                labels
                lines={[
                  { moves: ["U'", "R'"], durations: [1500, 1500], delay: 500, highlight: [...CENTERS, "GR"] }
                ]}
                progress
              />
            </div>
          </div>
        </div>
        <p>{`Let's learn a basic way to tell if an edge is good or bad.`}</p>
        <p>{`An F2L edge in the top layer will have one color on top and one color on the side. The edge is good if the side color is the same as the left or right center color. If the side color is the same as the front or back center, it's bad.`}</p>
        <p>{`In the "Good edge" example above, the side color is red. That matches the right center color. Good edge. We don't need to do any moves to check if the edge is good or not.`}</p>
        <p>{`What about this orange-green edge? Good or bad?`}</p>
        <div className="w-80 h-80 mb-2  border border-neutral-400 rounded-sm overflow-hidden">
          <CubeImage
            facelets="ORYGYRGYRGWRWWWRWORGYOGBWGGBYGYOOWOBOBBBBGWBWYOYRRYBRO"
            angles={{ x: 30, y: -45 }}
            hints
            labels
            highlight={["WGR", "WBR", "WBO", "WGO", "YGR", "YGO", "YBO", "YBR", "WG", "WR", "WB", "WO", "YG", "YR", "YB", "YO", "GR", "GO", "BR", "BO", "W", "O", "G", "R", "B", "Y"]}
          />
        </div>
        <input type="checkbox" id="good1-answer" className="hidden peer/good1" />
        <label htmlFor="good1-answer" className="inline-block peer-checked/good1:hidden cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
          Click to reveal the answer
        </label>
        <label htmlFor="good1-answer" className="hidden peer-checked/good1:inline-block cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
          Click to hide the answer
        </label>
        <div className="opacity-0 peer-checked/good1:opacity-100 transition-opacity duration-500 text-neutral-400 mb-4">
          {`It's a good edge. The side color on the edge is orange which is the same as the right center color.`}
        </div>
        <p>{`If we're on Level 4, our goal is just to turn the bad edge into a good one. We'll learn how to do this by rotating the cube with a `}<code>y</code>{` move. `}
          <LessonLink text="Click here" href="/learn/notation/#rule-4-rotations-get-xyz" />
          {` to review what a `}<code>y</code>{` move is.`}
        </p>
        <p>{`If the edge is good, we go to Level 3.`}</p>
        <H2>Level 3 — Are the pieces adjacent?</H2>
        <p>{`At this level, both pieces are in the top layer, but they're touching in a way that makes it clear that they're not connected properly.`}</p>
        <div className="flex flex-col gap-1 mb-6">
          <span className="text-sm font-bold">Adjacent pieces, not paired</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeImage
              facelets="YRRRYBYGWGWRWWWRWGBYBOGBWGGOOYYOGWORBBGOBGYBWOYORRYBRO"
              hints
              labels
              highlight={["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WBO", "BO"]}
            />
          </div>
        </div>
        <p>{`In this example, the edge is good, so we're not on Level 4. The blue stickers don't line up like the orange ones do, so the pieces aren't connected properly. We must be on Level 3.`}</p>
        <p>{`Our goal will be to separate them, unless they are already connected, or "paired" together. We'll explore what it means for pieces to be paired in just a second.`}</p>
        <H2>Level 2 — Are the pieces separated?</H2>
        <p>{`This level is mostly self-explanatory. If the pieces are in the top layer and separated, but not paired, we're on this level.`}</p>
        <div className="flex flex-col gap-1 mb-6">
          <span className="text-sm font-bold">Separated pieces</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeImage
              facelets="WOOGYRWBGYWOWWWOWRBYROORBOGWBBYBGYBYYGBYROGRWORRYGBGGR"
              hints
              labels
              highlight={["WBR", "WG", "WR", "WB", "WO", "BR", "W", "O", "G", "R", "B", "Y"]}
            />
          </div>
        </div>
        <p>{`The side sticker is blue, which matches the right center, so it's a good edge. We can rule out the other levels as well. The pieces aren't in the middle or bottom, aren't touching, and we'll learn next that they aren't paired. So this is a Level 2 case. Our goal will be to pair the pieces.`}</p>
        <H2>Level 1 — Are the pieces paired?</H2>
        <p>{`"Paired" means the F2L pieces can be solved in 3 or 4 moves. There's only two types of pairs.`}</p>
        <p>{`A "connected" pair is when the pieces are adjacent and the colors line up correctly. As far as this lesson is concerned, the edge must be good as well.`}</p>
        <div className="flex flex-col gap-1 mb-6">
          <span className="text-sm font-bold">Connected pair on left</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeImage
              facelets="OYORYORYGGWRWWWWWWWBYGRRORBRBBGGGYGGYRWOOOOORBBBYBYGBY"
              angles={{ x: 30, y: -45 }}
              hints
              labels
              highlight={["WG", "WO", "WR", "WB", "WBR", "BR", "W", "O", "G", "R", "B", "Y"]}
            />
          </div>
        </div>
        <p>{`A "split" pair is when you can do an `}<code>R</code>{` or `}<code>L</code>{` move and make what looks like a connected pair.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Split pair</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                facelets="GYOGYRYBRGWGWWWWWWBOYGGYOGRBYWOOYYORBGWBBBGBBOOORRRRRY"
                angles={{ x: 30, y: 45 }}
                hints
                labels
                highlight={["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WBO", "BO"]}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Confirming it is a split pair with an R' move`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="y R B U' F2' D' F2' U L2' U R2' F2' L2' F2' U' R F' D2' L U2' B' F2' x2 F R2' D' R' D2' F2' L U L' R' U' R y' R U' R' U2' U R U' R' U R U2' R'"
                angles={{ x: 30, y: 45 }}
                hints
                labels
                lines={[
                  { moves: ["R'"], durations: [1500], delay: 300, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "BO", "WBO"] },
                ]}
                progress
                startHighlighted
              />
            </div>
          </div>
        </div>
        <p>{`Split pairs can be difficult to recognize. A good way to tell if you have a split pair and not just a Level 2 case is to look at the cross color sticker on the corner, and then look to the left. That's where the edge needs to be. The colors on top can't be the same or they won't connect. In other words, a split pair has:`}</p>
        <LessonList>
          {"Cross color on side (not on top)"}
          {"Different colors on top"}
          {"Edge to the left of corner (relative to cross sticker)"}
        </LessonList>
        <H2>Level 0 — Is the pair solved?</H2>
        <p>{`The F2L pair is solved, so there's nothing left to do but move on to the next pair. If all four pairs are solved, we move on to solve OLL.`}</p>
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
              {`Level 5. One piece is in the bottom layer, and both aren't solved.`}
            </div>
          </div>
        </div>
        <p>{`Now that we can tell what level of the tree we are in, our only remaining objective is to learn how to descend the tree.`}</p>

        <H1>Descending the tree</H1>
        <p>{`We're going to descend the tree by combining "triggers". Triggers are short, fast sequences of moves. You might already know one, called "sexy move", which is `}<code>{`R U R' U'`}</code>.</p>
        <p>{`All of the triggers we'll need are going to use `}<code>R</code>{`, `}<code>U</code>{`, and `}<code>L</code>{` moves. Unless you know what you're doing, don't use `}<code>F</code>{` or `}<code>B</code>{` moves during F2L. Turning the front and back faces is usually slow.`}</p>
        <p>{`We'll use `}<code>y</code>{` moves only on Level 4. Besides that, don't rotate the cube. If you can't see pieces, you can tilt the cube a little instead.`}</p>
        <p>{`All these restrictions will make it easier to figure out what to do. You'll have fewer options, which means there's fewer things to check.`}</p>
        <H2>On Level 5? Get pieces in top layer</H2>
        <p>{`When we're on Level 5, our goal is to get both pieces into the top layer. Let's jump right into an example.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Level 5 —  Example 1</span>
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
        <p>{`Any trigger we do will make changes to one of these slots. So we have to be careful which one we change.`}</p>
        <p>{`The front-right slot isn't solved, so we're allowed to make changes to what pieces are there. That almost goes without saying. The piece we need to get out of the middle layer is in the front-right slot, so of course we have to change it. We'll call the slot we change our "target slot".`}</p>
        <p>{`The slot we change is determined by the first `}<code>R</code>{` or `}<code>L</code>{` move that we do. If we want to target the front right-slot, we need to move that slot up into the top layer. We do that by turning the right face clockwise.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Expose front-right slot</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p>{`But there's a problem. We just unsolved cross! We really need to undo that right face turn with an `}<code>R'</code>{` as soon as possible.`}</p>
        <p>{`But the cross piece is only in the middle layer. We're still free to turn the top layer, and that's where we just moved the front-right slot to anyway. So let's turn the top layer.`}</p>
        <p>{`A lot of the experimentation in F2L comes from figuring out whether to do `}<code>U</code>{`, `}<code>U'</code>{`, or `}<code>U2</code>.{` So let's just try one of those. We'll try `}<code>U</code>{`. After, we'll do `}<code>R'</code>{` to solve cross again.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Trying R U R'`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p><code>{`R U R'`}</code>{` is a trigger, and it's basically just sexy move. And it didn't really work. It did take the edge out of the middle layer, but it put the corner we need into the bottom layer.`}</p>
        <p>{`You'll learn to detect this kind of thing before it happens. If the corner is just above the front-right slot, sexy move will always put the corner into the slot.`}</p>
        <p>{`We have two ways to change what we try. We can try doing a `}<code>U</code>{` move before we do a trigger, or we can do a different trigger. Let's go back to the original case and try both:`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Trying doing a U move first (U R U R')`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Trying different trigger (R U2 R')`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p>{`Both worked! In both cases, both pieces are in the top layer. The relevant question is: why?`}</p>
        <p>{`Doing a `}<code>U</code>{` move first worked because it got the corner out of the way before we started. The different trigger worked because it got both pieces out of the way before we did `}<code>{`R'`}</code>.</p>
        <p>{`To summarize, we descend from Level 5 by:`}</p>
        <LessonList>
          <span className="font-normal">{`(Sometimes) Doing a `}<code>U</code>{` move.`}</span>
          <span className="font-normal">{`Moving the target slot up into the top using an `}<code>R</code>{` or `}<code>L</code>{` move.`}</span>
          <span className="font-normal">{`Doing a `}<code>U</code>{` move.`}</span>
          <span className="font-normal">{"Undoing the original "}<code>R</code>{` or `}<code>L</code>{` move.`}</span>
        </LessonList>
        <p>{`We're basically doing a `}<code>U</code>{` move and then a trigger. We'll use this idea on a lot of the levels. Unlike on Level 5 where there's a bit of ambiguity, we can usually make informed decisions about what trigger we'll need to use.`}</p>
        <p>{`Let's look at one more example at Level 5. This time, the stuck piece is in the back-left slot.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Level 5 — Example 2</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                facelets="GOYGYBBBOYWWWWWGWWYRWOBBGBGBYOORYORBBGRRGRRGRWYRGOYYOO"
                angles={{ x: 30, y: -45 }}
                hints
                labels
                highlight={["WG", "W", "O", "G", "R", "B", "Y", "WO", "WB", "WR", "WGR", "GR"]}
              />
            </div>
          </div>
        </div>
        <p>{`If you got this case facing blue, keep facing blue. You can tilt the cube if you need to see pieces in the back better, but don't change your grip on the cube or do `}<code>U</code>{` moves. This helps avoid common bad habits.`}</p>
        <p>{`The corner is right on top of the edge. Let's choose to do a `}<code>U</code>{` move to get the corner out of the way. Then we expose the back left slot by turning the left face. After, another `}<code>U</code>{` to get the edge out of that slot. Finally, fix cross.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Trying U L U L'</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="U' R' U B2 D R F' U2 R2 U B2 D' F2 B2 U' F2 D B2 D' F' L' x2 D L' F' L2 D U2 R' U R U'"
                angles={{ x: 30, y: -45 }}
                hints
                labels
                lines={[
                  { moves: ["U", "L", "U", "L'"], durations: [1500, 1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGR", "GR"] }
                ]}
                progress
                startHighlighted
              />
            </div>
          </div>
        </div>

        <H2>On Level 4? Make edge good</H2>
        <p>{`After Level 5, descending from Level 4 should feel like a breath of fresh air. All we have to do is a `}<code>y</code>{` or `}<code>{`y'`}</code>{` when there's a bad edge.`}</p>
        <p>{`Here's a Level 4 case, meaning the edge is bad and both pieces are in the top layer. We can rotate either direction and that'll make the edge good.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Level 4 example</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                facelets="RBGRYORBGYWYWWWOWOYRRYRYBRBWYWBGOOGBOOBGOGWOGWYGRBGYBR"
                angles={{ x: 30, y: -30 }}
                hints
                labels
                highlight={["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WBR", "BR"]}
              />
            </div>
          </div>
        </div>
        <p>{`We'll choose to do `}<code>{`y'`}</code>{` and not `}<code>y</code>{` because that will mean the slot we are trying to solve, the one between the red and blue centers, is still in the front. It's easier to see front slots.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Level 4 solution</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p>{`Choosing which way to rotate is actually a complex subject. It can be better to solve back slots since pieces can no longer be hiding in the back as much. We'll discuss this more in future lessons.`}</p>

        <H2>On Level 3? Separate pieces</H2>
        <p>{`If the pieces are adjacent, we need to separate them.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Level 3 — Example 1</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                facelets="ORYGYGRBOGWYWWWRWGWYWRBGRBBBRGYROORROBGBGYYGBWOBOOYYOW"
                angles={{ x: 30, y: -30 }}
                hints
                labels
                highlight={["W", "O", "G", "R", "B", "Y", "WGO", "GO", "WO", "WB", "WR", "WG"]}
              />
            </div>
          </div>
        </div>
        <p>{`From here-on-out, we'll know the direction of the slot we are solving. The colors on our F2L pieces are orange and green, and orange and green is the color of the centers next to the back-left slot.`}</p>
        <p>{`Since we're solving a left-hand slot, we know our solution for the rest of the pair will be `}<code>L</code>{` and `}<code>U</code>{` moves. We know we can expose the back-left slot, since that's the one we're solving. So we know that we can do `}<code>L</code>{` and it'll be fine, as long as we do `}<code>{`L'`}</code>{` later.`}</p>
        <p>{`Turn the `}<code>U</code>{` layer so that the corner is on the same side, left or right, as the target slot, and the edge isn't. This will mean that moving the target slot up will separate the pieces. In this first example, we expose the target slot correctly, but we don't do the right `}<code>U</code>{` move before it, so turning the left face doesn't separate the pieces.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Trying L (Incorrect)`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="U F B2 L' B' R F' U' L2 U' F2 U' L2 D2 F2 R2 D' B2 L2 R B' x2 L B D F' D2"
                angles={{ x: 30, y: -30 }}
                hints
                labels
                lines={[
                  { moves: ["L"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WGO", "GO", "WO", "WB", "WR", "WG"] }
                ]}
                progress
                startHighlighted
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Trying U' L (Correct)`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="U F B2 L' B' R F' U' L2 U' F2 U' L2 D2 F2 R2 D' B2 L2 R B' x2 L B D F' D2"
                angles={{ x: 30, y: -30 }}
                hints
                labels
                lines={[
                  { moves: [["U'"], ["L"]], durations: [1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WGO", "GO", "WO", "WB", "WR", "WG"]}
                ]}
                progress
                startHighlighted
              />
            </div>
          </div>
        </div>
        <p>{`Next, we turn the `}<code>U</code>{` layer so that none of our F2L pieces are in the `}<b>top left</b>{`. Finally we can undo the original `}<code>L</code>{` or `}<code>R</code>{` move. Let's look at a couple attempts at this:`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Trying U' L U L' (Incorrect)`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Trying U' L U' L' (Correct)`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p>{`The first example is wrong because it brought the edge into the top left, and our edge ended up in the middle layer. We need to get the pieces out of the way before we restore cross.`}</p>
        <p>{`To summarize:`}</p>
        <LessonList>
          <span className="font-normal">{`Figure out if your target slot is on the left or right.`}</span>
          <span className="font-normal">{`Turn the top layer so the corner is on that left-or-right side and the edge isn't.`}</span>
          {`Expose the target slot.`}
          {`Move the edge and/or corner out of the way.`}
          {`Fix cross.`}
        </LessonList>
        <p>{`Separating F2L pieces will sometimes involve "hiding" a piece. Our last example had this. We hid the corner in the bottom layer so that we could move the edge around.`}</p>
        <p>{`But we could also hide the edge and move the corner. For simplicity, we only show hiding the corner.`}</p>
        <p>{`Sometimes you don't hide a piece. In this next example, moving the target slot to separate the pieces keeps them both in the top layer. We have to be careful to do the right `}<code>U</code>{` move after. Before you click play, figure out which move exposes the target slot.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Level 3 — Example 2`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="U F B2 L' B' R F' U' L2 U' F2 U' L2 D2 F2 R2 D' B2 L2 R B' x2 L B D F' D2 U' L U' L' U L U L' y' U2 R U R' U2 R U R' y2 d'"
                hints
                labels
                angles={{ x: 30, y: -30 }}
                lines={[
                  { moves: ["L'", "U2", "L"], durations: [1500,2000,1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGR", "GR"] }
                ]}
                progress
                startHighlighted
              />
            </div>
          </div>
        </div>
        <p>{`The corner is already on the left, and the edge isn't, so we don't need to do any `}<code>U</code>{` moves at the start. `}<code>L'</code>{` separates the pieces. `}<code>U2</code>{` gets both pieces out of the left layer. Then we fix cross. `}</p>

        <H2>On Level 2? Pair pieces</H2>

        {/* TODO: add fun image */}
        <p>{`We're getting there. This can all feel like a lot, or even be overwhelming. But the good news is that once you know how to do all these steps, you'll be well on your way to having good F2L without a lot of bad habits, just some inefficiencies.`}</p>

        <p>{`There's three cases you can have at Level 2. When we have the first two cases, we're going to set up a connected pair. Otherwise, a split pair:`}</p>

        <Level2CasesDiagram />
        
        <p>{`Let's look at how we deal with each case. After, we'll summarize to make this easier to remember.`}</p>
      
        <H3>Cross color on top</H3>
        <p>{`With this first case, we first need to turn the top layer so that the edge "connects" to the center. The edge and the center color will match. Here's an example:`}</p>
        <div className="flex flex-col gap-1 pb-6">
          <span className="text-sm font-bold">{`Cross color on top case — Connect edge`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
          </div>
        </div>
        <p>{`Then, hide the edge by bringing up the target slot. Turn the top layer so that the corner is on top of the edge. Fix cross.`}</p>
        <div className="flex flex-col gap-1 pb-6">
          <span className="text-sm font-bold">{`Cross color on top case — Solve case`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="y U B2 L D F L' B D R U2 B2 D' B2 D2 B2 L2 D' R2 L2 D L2 x2 L' F' B' R D L2 R U R' d' U"
              angles={{ x: 30, y: -30 }}
              hints
              labels
              lines={[
                { moves: ["L'", "U'", "L"], durations: [1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WBO", "BO"] }
              ]}
              progress
              startHighlighted
            />
          </div>
        </div>
        <H3>Top colors match</H3>
        <p>{`This next case, we hide the corner instead of the edge. We do that by putting the corner diagonal from the target slot. If the target slot is front-right, put the corner in the back-right. If the target slot is back-left, put the corner front-left. And so on.`}</p>
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
        <p>{`Take a close look at the cube with the red-blue F2L pieces above after we move the corner. Our goal here is to make a connected pair. If the blue edge was to the right of the blue corner, we'd have that. The blue stickers on top would connect, and the red ones would too.`}</p>
        <p>{`After we hide the corner, we need to put the edge at that same location. You'll get good at visualizing this with practice, but for now, let's see what that looks like.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Top colors match case — Solve case`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="y2 U F U2 D' F' B U' L' F L2 D2 F2 L2 U L2 U' B2 R2 U2 D' x2 D' B R D' B2 L' B' D' U' B U B' U'"
                angles={{ x: 30, y: -30 }}
                hints
                labels
                lines={[
                  { moves: [["L"], ["U2"], ["L'"]], durations: [1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WBR", "BR"] }
                ]}
                progress
                startHighlighted
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Top colors match case — Bonus example`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="y2 U F U2 D' F' B U' L' F L2 D2 F2 L2 U L2 U' B2 R2 U2 D' x2 D' B R D' B2 L' B' D' U' B U B' L' U2 L d"
                hints
                labels
                lines={[
                  { moves: ["U'", "R", "U", "R'"], durations: [1500, 1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGR", "GR"] }
                ]}
                progress
              />
            </div>
          </div>
        </div>
        <H3>Top colors different</H3>
        <p>{`The last Level 2 case is when the two colors on top of the F2L pieces are different, but cross color isn't on top.`}</p>
        <p>{`Like the top colors matching case, we're going to put the corner diagonal from the target slot, then hide the corner by bringing the target slot up. The only difference is where we move the edge to after.`}</p>
        <div className="flex flex-col gap-1 pb-6">
          <span className="text-sm font-bold">{`Top colors different case — Place corner diagonal`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="y U F U2 D' F' B U' L' F L2 D2 F2 L2 U L2 U' B2 R2 U2 D' x2 D' B R D' B2 L' B' D' d U' R U' R' U'"
              hints
              labels
              lines={[
                { moves: ["U2"], durations: [1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGO", "GO"] }
              ]}
              progress
              startHighlighted
            />
          </div>
        </div>
        <p>{`Once the corner is in the right position, take note of which side of the cube it is on, left or right? We need to put the edge on the opposite face as that.`}</p>
        <p>{`In our example, the corner is on the right. So the edge needs to go on the left.`}</p>
        <p>{`As before, we hide the corner by lifting up the target slot, move the edge where it needs to go, then un-hide the corner.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Top colors different case — Solve case`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="y U F U2 D' F' B U' L' F L2 D2 F2 L2 U L2 U' B2 R2 U2 D' x2 D' B R D' B2 L' B' D' d U' R U' R' U' U2"
                hints
                labels
                lines={[
                  { moves: [["R"], ["U"], ["R'"]], durations: [1500, 1500, 1500], delay: 200, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGO", "GO"] }
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
        <p>{`To solve the connected pair case, we make sure that the pair isn't in the same layer, left or right, as the target slot.`}</p>
        <div className="flex flex-col gap-1 pb-6">
          <span className="text-sm font-bold">{`Connected pair — Get pair out of the way`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
          </div>
        </div>
        <p>{`The target slot is in the right layer, so we turned the top face so that the connected pair wasn't in that layer.`}</p>
        <p>{`Then we raise the target slot, connect the pair to the cross edge, and fix cross.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Connected pair — Insert pair`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Connected pair — Bonus example`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p>{`When we have the split pair case, we need to be a bit more specific about where we put it. The corner of the split pair needs to go directly above the target slot.`}</p>
        <div className="flex flex-col gap-1 pb-6">
          <span className="text-sm font-bold">{`Split pair — Get corner on top of target slot`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
          </div>
        </div>
        <p>{`From there it's very similar to the connected pair case. We raise the target slot, which connects the pieces. We move the `}<code>U</code>{` layer to connect the pair to the cross edge, and we fix cross.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Split pair — Insert pair`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">{`Split pair — Bonus example`}</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="R' D' R U' B2 D R' B R L2 D' R2 D' L2 D R2 B2 D2 B2 U B2 x2 y U' U L' U' L U R U' R' U R U2 R' U2"
                hints
                labels
                lines={[
                  { moves: ["U2", "R", "U", "R'"], durations: [2000, 1500, 1500, 1500], delay: 500, highlight: ["W", "WB", "WG", "WR", "WO", "GR", "WGR", "O", "G", "R", "B", "Y"] }
                ]}
                progress
              />
            </div>
          </div>
        </div>
        <p>{`Notice how when lift up the target slot, we connect the pieces together. Then, it's like we pull the pair into the slot. If you have to solve a split pair into one of the back two slots, it's a bit more like pulling. But nothing about the idea changes. A lot of learning to cube is getting used to how to mirror and rotate cases in your head to see similarities.`}</p>

        <H1>Full examples</H1>
        <H2>Example 1</H2>
        <p>{`Let's say we just solved white cross, and we see two F2L pieces right in front of us. The green-orange ones. Let's solve them.`}</p>
        <p>{`Both pieces are in the `}<code>U</code>{` layer, so we skipped Level 5. The edge clearly connects to the front center, not the left or right, so we're on Level 4. We need to rotate the cube.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example 1 — Make edge good</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="R2 B D2 F D2 F' L2 R2 F L2 D2 F2 D' U B' U2 R' B D2 L' D2 x2 R' B' F L2 D L' B L d U'"
                hints
                labels
                lines={[
                  { moves: ["y'"], durations: [1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WR", "WB", "WO", "WGO", "GO"] }
                ]}
                progress
              />
            </div>
          </div>
        </div>
        <p>{`We chose to rotate so that the orange-green slot is in the front right, where it's easier to see what we're doing.`}</p>
        <p>{`The edge is good now, and in theory we could be on any level from 3 to 1. We're on Level 3 since the pieces are adjacent.`}</p>
        <p>{`We turn the `}<code>U</code>{` layer so that one piece is on the same side, right, as the target slot, and one isn't. Then we raise the target slot, turn the `}<code>U</code>{` layer again so that both pieces aren't on the right-hand side, and fix cross.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example 1 — Separate pieces</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p>{`Now we have the Level 2 case where the colors on top of the F2L pieces match.`}</p>
        <p>{`To solve the color matching case, remember that we hide the corner by putting it diagonal from the target slot. That means putting the corner in the back-right. The same as normal: we raise the target slot. This time our goal is to move the edge so that the corner will connect to it when we fix cross.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example 1 — Pair pieces</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p>{`We have a connected pair, which means we need to get it out of the way of the right layer where the target slot is. We choose to do `}<code>{`U'`}</code>{`, but we could have done `}<code>U2</code>.</p>
        <p>{`Raise the target slot, find the right `}<code>U</code>{` move that connects the pair to the cross, then fix cross.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example 1 — Insert pair</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p>{`This is just an example of the procedure. This isn't actually the best way to solve this pair, because we're allowed to modify other slots than just our target slot, if they aren't solved. But that's beyond the scope of this tutorial.`}</p>
        <H2>Example 2</H2>
        <p>{`This time, we have a couple pairs already solved in the front two slots. This won't change much, but it does mean we can't see any pairs very easily. But we do see a blue-red edge. Tilting the cube would reveal that the blue-red-white corner is in the back right slot. We'll solve that.`}</p>
        <p>{`This is a Level 5 case, so we need to take out the corner. There's many ways we can do this. One idea that works here is to keep the edge on the right. When we raise the target slot, that will hide the edge and keep it out of the way. After that, we move the `}<code>U</code>{` layer and fix cross again.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example 2 — Take corner out</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                scramble="x2 y' L2 B U' L U' B L B2 U B2 L2 U' L2 U L2 B2 U L2 B2 U2"
                hints
                labels
                lines={[
                  { moves: ["R'", "U'", "R"], durations: [1500, 1500, 1500], delay: 500, highlight: ["W", "O", "G", "R", "B", "Y", "WG", "WO", "WR", "WB", "WBR", "BR", "WGO", "GO", "BR", "BO", "WBO", "WBR"] }
                ]}
                progress
              />
            </div>
          </div>
        </div>
        <p>{`The top color on the edge is blue, and the side is red. Red does not match the left or right center color, so this is a bad edge. We need to rotate.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example 2 — Make edge good</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p>{`The pieces are separated but not paired, so we're on Level 2.`}</p>
        <p>{`The top colors don't match, and it's not a case with cross color on top, so we hide the corner.`}</p>
        <p>{`The corner needs to go diagonal from the target slot, which it already is. The corner is on the right. The edge needs to go on the opposite side: on the left. So we hide the corner, move the edge to the left side, then fix cross.`}</p>

        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example 2 — Pair pieces</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
        <p>{`The final step is to insert.`}</p>
        <p>{`For split pairs, the corner always goes right above the target slot. We start with `}<code>U</code>{`, then insert by pulling the edge in with the corner.`}</p>
        <div className="flex flex-row flex-wrap gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Example 2 — Insert pair</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
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
            </div>
          </div>
        </div>
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

        <FurtherLearning sources={SOURCES} />
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

type SlotLabel = (typeof SLOT_LABELS)[number];

function SlotLeader({ anchor, pill }: SlotLabel) {
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

type ScenePoint = { x: number; y: number; z: number };
type ArrowDiagramProps = {
  id: string;
  facelets: string;
  angles: { x: number; y: number };
  from: ScenePoint;
  to: ScenePoint;
  textLabels: { text: string; x: number; y: number }[];
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
      facelets="YYYYYYXYY WWWWWWXWW XGGGGGGGG OOOOOOOOO BBBBBXBBX RRXXRRXRR"
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
      ariaLabel="Grey corner in the top back-right. Grey edge in the top left. Arrow across the top face from the back-right corner to the back-left corner."
    />
  );
}

function ArrowDiagram({ id, facelets, angles, from, to, textLabels, ariaLabel }: ArrowDiagramProps) {
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
        {textLabels.map((label) => (
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
const LEVEL_DESCRIPTIONS = [
  "Pieces solved",
  "Pieces paired in the top layer",
  "Pieces separated in the top layer",
  "Pieces connected in the top layer",
  "Edge does NOT connect to the left or right center",
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
