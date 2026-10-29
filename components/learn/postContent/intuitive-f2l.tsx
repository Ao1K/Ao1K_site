import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";
import Story from "../LessonStory";
import LessonLink from "../LessonLink";
import LessonList from "../LessonList";
import CubeScene from "../CubeScene";
import CubeImage from "../CubeImage";
import { H1, H2 } from "../LessonHeading";
import type { PieceName } from "../cubeProps";
import FurtherLearning, { Citation, type Source } from "../FurtherLearning";

export default function IntuitiveF2L() {
  return (
    <>
      <TitleBar title="Intuitive F2L" subtitle="And the tree of possibilities" audience="all" />
      <LessonBody>
        <Story storyParagraphs={[
          `Peaku drops the sword. Blood drips from a cut on his arm.`,
          `Prynth nods. "You found your passion. Good. Let's take a break."`,
          `Prynth returns inside, unbothered. Peaku doubles over, still panting, then drops to the ground. So much to this world: slices, stabs, dodges.`,
          'Tiny claws scratch on bark. High above, a squirrel finds an acorn. Peaku can barely see it among the many, many branches. But it becomes more visible as it descends. It leaps from one branch to another. Peaku has the sense that the animal does not know the route perfectly.',
          `Eventually, the squirrel is successful. It reaches the lower trunk of the tree, then runs off to bury its acorns.`,
          `So many branches in its world, and yet it persists.`,
          `Peaku struggles to his feet.`
        ]} />
        <p>{`F2L (First 2 Layers) is like a tree with many branches.`}</p>
        <p>{`Some beginner tutorials simplify F2L to having only three basic cases that you need to be able to solve. You may sometimes hear there are 41 cases. The truth is that the full tree has hundreds of cases.`}</p>
        <p>{`It is not possible to memorize all these cases at once. We simplify at first so that you can at least solve F2L. You can learn about the details over time, which makes you faster and more efficient. If F2L is like an enormous tree, then over weeks and months, you learn to descend the branches on the shortest path.`}</p>
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
        <p>{`Our next goal is to figure out what level you're on at any given time. Think of this like identifying the problem that we need to answer. We need to know level we're on so that we can continue solving the pair.`}</p>

        <H1>Finding your place in the tree</H1>
        <p>{`We can figure out which level you're at by asking some basic questions. We ask in order from Level 5 to Level 0. `}<b>{`If the answer is yes, that is the level you are on.`}</b></p>
        
        <H2>Level 5 - Are pieces in the bottom or middle layer?</H2>
        <div className="flex flex-col items-center gap-x-8 sm:flex-row sm:items-start pb-6">
          <div className="flex-1">
            <p>{`If there are pieces in the F2L pair are not both in the top layer, you're at this level.`}</p>
            <p>{`Even if a piece is in the right spot and solved correctly, you're at this level unless both pieces are solved. Naturally, if both pieces are solved, you're done here!`}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">F2L pieces in bottom and middle</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeImage
                facelets="ORYGYRGYRRWOWWWGWRRGYYOOWOBBYGBBGWBWOBBRRYBROYOYOGBWGG"
                angles={{ x: -30, y: 30 }}
                labels
                highlight={["W", "O", "G", "R", "B", "Y", "WG", "WO", "WB", "WR", "WBO", "BO"]}
                />
            </div>
          </div>
        </div>
        <p>{`In the example above, both F2L pieces are in the bottom or middle layer. The edge is solved, but the corner isn't, so this is a Level 5 case.`}</p>
        <p>{`If the pieces are both in the top layer, we continue to the Level 4 question.`}</p>

        <H2>Level 4 - Is the edge bad?</H2>
        <p>{`Once we have both pieces into the top layer, we need to determine if the F2L edge is "good" or "bad". Basically, edges are good when can be solved with `}<code>R</code>{', '}<code>L</code>{', '}<code>U</code>{', and '}<code>D</code> moves.</p>
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
        <p>{`An F2L edge in the top layer will have one color on top and one color on side. The edge is good if the side color is the same as the left or right center color. If the side color is the same as the front or back center, it's bad.`}</p>
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
        <H2>Level 3 - Are the peices adjacent?</H2>
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
        <H2>Level 2 - Are the pieces separated?</H2>
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
        <H2>Level 1 - Are the pieces paired?</H2>
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
            <span className="text-sm font-bold">Confirming it is a split pair with an R' move</span>
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
        <p>{`Split pairs can be difficult to recognize because one piece may be in back and the other in front, or vice versa.`}</p>
        <H2>Level 0 - Is the pair solved?</H2>
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
        TBD.
      </LessonBody>
    </>
  );
}

const CENTERS: PieceName[] = ["W", "Y", "G", "R", "B", "O"];
const CROSS_PIECES: PieceName[] = [...CENTERS, "WB", "WG", "WO", "WR"];
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

const TREE_EXAMPLE_SCRAMBLE = "U L' F2 R2 D' R B' U' F D2 R' F2 U2 B2 R' F2 U2 R' B2 R2 D2 x2 F' R B U L2 y2";
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
