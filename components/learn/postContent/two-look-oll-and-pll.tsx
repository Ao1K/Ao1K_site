import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";
import Story from "../LessonStory";
import AnnotatedCubeScene from "../AnnotatedCubeScene";
import CubeImage from "../CubeImage";
import CubeWrapper from "../CubeWrapper";
import ExternalLink from "../../ExternalLink"
import { H1, H2, H3 } from "../LessonHeading";
import FurtherLearning, { Citation, type Source } from "../FurtherLearning";
import { SimpleCube, type Color } from "../../../composables/recon/SimpleCube";
import { DEFAULT_SCENE_LOOK, parseScramble } from "../../../utils/cubeSceneAuthoring";
import { cube3x3 } from "../../../utils/parser/cube3x3";

const LINKS = [ 
  {
    id: "spaced-repetition",
    title: "Spaced Repetition",
    attribution: "from Wikipedia",
    href: "https://en.wikipedia.org/wiki/Spaced_repetition",
  }
] as const satisfies readonly Source[];

export default function TwoLookOllAndPll() {
  return (
    <>
      <TitleBar title="Two-Look OLL and PLL" subtitle="" audience="all" />
      <LessonBody>
        <Story storyParagraphs={[
          `The three on the Council mutter amongst themselves, tired and uninterested, then look to Peaku. "If you plan to leave, you must leave soon. We will give you one night and one day to make your preparations. By tomorrow's sunset, you must have left."`,
          `Peaku knows better than to attempt to sway them.`,
          `Yamison is waiting for him outside the hall.`,
          `"It is not enough time to prepare for much of anything," Peaku says.`,
          `Yamison limps with his cane, but his face remains placid. "No. It is not. Is your back strong?"`,
          `Peaku shrugs. Hopefully he won't have to carry Yamison home.`,
          `Yamison's natural frown deepens. "It is not about how much you know, but how much you are capable of. You teach yourself from my books well. You will bring them with you."`
        ]} />
        <p>{`You can't learn everything all at once. But with the right techniques, you can at least make the learning go more smoothly.`}</p>
        <p>{`The first half of this lesson will discuss which algorithms you should learn to get started with CFOP. The second half will teach you how to most easily memorize them.`}</p>
        <H1>The first 16 algorithms</H1>
        <p>{`There are `}<b>{`ten`}</b>{` two-look OLL algs and `}<b>{`six`}</b>{` two-look PLL algs. It is strongly recommended you learn all 16 to get started. You could learn fewer, but that would make your solves much slower.`}</p>
        <p>{`In two-look OLL, you orient edges in the first look, then corners in the second.`}</p>
        <p>{`In two-look PLL, you solve corners then edges.`}</p>
        <p>{`Here are the names of all the cases and what they look like. We'll talk about the algorithms after.`}</p>

        <H2>OLL cases</H2>
        <LastLayerDiagram groups={OLL_GROUPS} fullNameHeader="Full OLL case" layout={OLL_LAYOUT} />

        <p>{`In the first look of OLL, ignore what the corners look like. For example, these are both the dot case:`}</p>

        <DotCaseExamples />

        <H2>PLL cases</H2>
        <p>{`PLL cases are a bit harder to recognize, so included below are tips on what to look for.`}</p>
        <LastLayerDiagram groups={PLL_GROUPS} fullNameHeader="Full PLL case" layout={PLL_LAYOUT} />

        <p>{`Every time you see one of these cases, you will use a certain algorithm. It's not the colors that you will be looking for, exactly. Instead, you're looking for the same `}<b>{`pattern`}</b>{` of colors. For example, these are the exact same case (Ua), solved the exact same way:`}</p>
        <CubeWrapper>
          <CubeImage scramble={`x2 y ${UA_PERM_SETUP}`} angles={UA_PERM_ANGLES} hints className="aspect-square w-full" />
          <CubeImage scramble={`x2 ${UA_PERM_SETUP}`} angles={UA_PERM_ANGLES} hints className="aspect-square w-full" />
        </CubeWrapper>
        <H2>Fingertricks</H2>
        <p>{`Every algorithm can make use of certain movements of your fingers, called fingertricks. Many fingertricks feel unnatural and slow at first. They make learning each alg more complicated. But in the long run, they make your solves faster.`}</p>
        <p>{`It's up to you whether you want to try to use the best fingertricks for each alg right away. If you choose not to, you will likely have to relearn how to perform each algorithm at some point.`}</p>
        <H2>Resources</H2>
        <H3>Videos</H3>
        <p>{`Because of the importance of fingertricks, learning algs from videos is a good idea. It makes it easy to see how to perform each alg.`}</p>
        <p>{`Videos for OLL:`}</p>
        <ol className="list-inside list-decimal text-base text-neutral-400 leading-relaxed sm:text-md space-y-2 mb-4 pb-4">
          <li>
            <ExternalLink href="https://youtu.be/6PSBaxlBqRg" text="Two-look OLL" />
            {` by CubeHead`}
          </li>
          <li>
            <ExternalLink href="https://youtu.be/vU6HsK3hvQs" text="Full OLL" />
            {` by J Perm`}
          </li>
          <li>
            <ExternalLink href="https://youtu.be/I7K9BqYdf1A" text="Full OLL" />
            {` by Brina Sun`}
          </li>
        </ol>
        <p>{`Videos for PLL:`}</p>
        <ol className="list-inside list-decimal text-base text-neutral-400 leading-relaxed sm:text-md space-y-2 mb-4 pb-4">
          <li>
            <ExternalLink href="https://youtu.be/ZC9nwou59ow" text="Two-look PLL" />
            {` by CubeHead`}
          </li>
          <li>
            <ExternalLink href="https://youtu.be/9r_HqG4zSbk" text="Full PLL" />
            {` by J Perm`}
          </li>
          <li>
            <ExternalLink href="https://youtu.be/y3TGdTgyp3M" text="Full PLL" />
            {` by Brina Sun`}
          </li>
        </ol>

        <p>{`Note that some of the linked videos are for the full set rather than two-look, as they show the fingertricks better. You can use the diagrams from earlier to identify which algs in the full list are also two-look algs.`}</p>

        <H3>Websites</H3>
        <p>{`If you are not worrying about fingertricks, or already know good fingertricks, then these text-based resources may suit you better. Some sites include videos.`}</p>
        <p>{`Sites for OLL and PLL:`}</p>
        <ol className="list-inside list-decimal text-base text-neutral-400 leading-relaxed sm:text-md space-y-2 mb-4 pb-4">
          <li>
            <ExternalLink href="https://www.speedcubedb.com/a/3x3" text="Speedcubedb.com" />
            {` (Algs and videos)`}
          </li>
          <li>
            <ExternalLink href="https://jperm.net/3x3/cfop/ll" text="Jperm.net" />
            {` (Algs and trainer)`}
          </li>
          <li>
            <ExternalLink href="https://www.cube.academy/3x3-algorithms-overview" text="cube.academy" />
            {` (Algs and videos)`}
          </li>
          <li>
            <ExternalLink href="https://reco.nz/algs/oll" text="reco.nz OLL" />
            {` and `}
            <ExternalLink href="https://reco.nz/algs/pll" text="reco.nz PLL" />
            {` (Most popular algs used by top cubers)`}
          </li>
        </ol>


        <p>{`But let's not get too far ahead of ourselves. How do we learn these?`}</p>

        <H1>How to memorize algs</H1>
        <p>{``}</p>
        <H2>Learn just a few at a time</H2>
        <p>{`Many beginners make the mistake of looking up the algorithm that they need to continue a solve. Instead, you should learn algorithms separately from solves.`}</p>
        <p>{`It doesn't matter which you pick to learn first. Just pick one or two to start with.`}</p>
        <H2>Rely on muscle memory</H2>
        <p>{`The most basic way to learn algorithms is to perform them many times.`}</p>
        <p>{`Read the algorithm and perform it at the same time. Slowly begin taking your eyes away from the written algorithm, trying to perform parts of the alg without looking. Try to remember the action you're taking next, not so much the letters. Much like someone learning to walk, you'll begin to get used to the action and be able to do the algorithm without thinking so deliberately.`}</p>
        <H2>Use spaced repetition</H2>
        <p>{`Once you can perform the algorithm without looking, take a small break. You have now achieved short-term memory of the alg.`}</p>
        <p>{`By taking a break, you are forcing yourself to remember the algorithm for longer.`}</p>
        <p>{`Practice the alg again a few times before you forget it. You should find that you can wait longer and longer before practicing it again. First a few minutes, then perhaps 15, then perhaps an hour, then a day.`}</p>
        <p>{`This is the idea behind spaced repetition. You take longer and longer breaks between practicing the alg. It is an effective way to build long-term memory.`}<Citation sources={LINKS} id="spaced-repetition" /></p>
        <H2>Use chunking</H2>
        <p>{`But muscle memory is not the only technique you can use to build short-term memory. Let's discuss several more, starting with "chunking".`}</p>
        <p>{`Chunking is the practice of breaking the alg into smaller groups that you then memorize. This is the most common reason you'll see parentheses around parts of an alg, such as `}<code>{`F (U R U' R') F'`}</code>{`.`}</p>
        <p>{``}<code>{`(U R U' R')`}</code>{` is a "trigger", a short, common sequence of moves. Algs are often chunked based on what triggers make up the alg. That way, you can simply think of what triggers to perform instead of each individual move.`}</p>
        <p>{`You don't have to group things based on triggers. You can break up the alg in whatever way helps.`}</p>
        <H2>Watch how F2L pairs move</H2>
        <p>{`If you've learned basic F2L, you know what an F2L pair looks like.`}</p>
        <CubeWrapper titles={["Orange-blue connected pair"]}>
          <CubeImage scramble="y x2 R2 B2 U B2 U' B2 D B2 D' R' U R'" angles={{ x: 30, y: -30 }} hints className="aspect-square w-full" />
        </CubeWrapper>
        <p>{`OLL and PLL algs will commonly take out F2L pairs, move them around, then solve them again.`}</p>
        <p>{`You can treat this movement as a story. The story describes where the pair goes and what happens to it. Remembering the story can be easier than remembering individual moves.`}</p>
        <CubeWrapper titles={["J perm story"]}>
          <AnnotatedCubeScene
            scramble="x2 R2 B2 U B2 U' B2 D B2 D' R2"
            angles={{ x: 30, y: 30 }}
            hints
            lines={[
              {
                moves: ["R", "U", "R'", "F'", "R", "U", "R'", "U'", "R'", "F", "R", "R", "U'", "R'"],
                durations: Array(14).fill(1500),
                delay: 200,
              },
            ]}
            annotations={[
              { ...BOTTOM_LEFT_TEXT, text: "Take out pair", moves: [0, 2] },
              { ...BOTTOM_LEFT_TEXT, text: "Hide pair on left", moves: [3, 3], duration: 1500 },
              { ...BOTTOM_LEFT_TEXT, text: "Sexy move", moves: [4, 7] },
              { ...BOTTOM_LEFT_TEXT, text: "Bring pair back up", moves: [8, 10] },
              { ...BOTTOM_LEFT_TEXT, text: "Insert pair", moves: [11, 13] },
            ]}
            progress
          />
        </CubeWrapper>
        <H2>Identify other patterns</H2>
        <p>{`Any other pattern you can find in the algorithm can also serve as a way to build some initial memorization.`}</p>
        <p>{`For example, the H perm alg `}<code>{`M2 U M2 U2 M2 U M2`}</code>{` is very symmetric. The first three moves and the last three moves are the same, with just a `}<code>{`U2`}</code>{` in the middle.`}</p>
        <p>{`Sometimes, algs will have a lot in common with other algs. J perm and T perm roughly include all the same triggers, just in different orders. The L and T two-look OLL algs can have a lot in common, depending on the algs. The more you memorize, the more similarities like this you'll discover.`}</p>
        {/* Example */}
        <H1>Slow and steady</H1>
        <p>{`These are all the major tricks to learning OLL and PLL algs. If you learn a few algorithms a day, you will have long-term memory for all 16 in well under a week. Some people manage it in a day or two.`}</p>
        <p>{`As long as you give yourself enough time to develop long-term memory, you should not have too much trouble.`}</p>
        <FurtherLearning sources={LINKS}/>
      </LessonBody>
    </>
  );
}

type StickerBox = { x: number; y: number; width: number; height: number };

type CaseCallout = {
  boxes: StickerBox[];
  lines: string[];
  side: "left" | "right";
  leaderStart: { x: number; y: number };
  dashed?: boolean;
};

type LastLayerCase = {
  name: string;
  fullName: string;
  alg: string;
  auf?: string;
  callouts?: CaseCallout[];
};

type LastLayerGroup = {
  look: "1st" | "2nd";
  isGrayed: (color: Color, isCorner: boolean) => boolean;
  cases: LastLayerCase[];
};

type LastLayerLayout = {
  row: string;
  diagramCell: string;
  diagramHeader: string;
  nameCell: string;
};

const ICON_SIZE = 24;
const ICON_MARGIN = 1;
const ICON_BACKGROUND_POINTS = "3,0 21,0 21,3 24,3 24,21 21,21 21,24 3,24 3,21 0,21 0,3 3,3";
const CALLOUT_ROOM = 24;
const LEADER_LENGTH = 3;
const LABEL_GAP = 1;
const LABEL_FONT_SIZE = 3.4;
const LABEL_LINE_HEIGHT = 4;

const BACK_SIDE: StickerBox = { x: 3, y: 0, width: 18, height: 3 };
const FRONT_SIDE: StickerBox = { x: 3, y: 21, width: 18, height: 3 };
const LEFT_SIDE: StickerBox = { x: 0, y: 3, width: 3, height: 18 };
const RIGHT_SIDE: StickerBox = { x: 21, y: 3, width: 3, height: 18 };
const ALL_SIDES = [BACK_SIDE, FRONT_SIDE, LEFT_SIDE, RIGHT_SIDE];

const LEFT_MIDDLE = { x: 0, y: 12 };
const RIGHT_MIDDLE = { x: ICON_SIZE, y: 12 };
const BAR_RIGHT_END = { x: 21, y: 1.5 };

const BAR_CALLOUT: CaseCallout = { boxes: [BACK_SIDE], lines: ["bar"], side: "right", leaderStart: BAR_RIGHT_END };

const ICON_BACKGROUND = "#161018";
const GRAY = "#888888";
const STICKER_COLORS: Record<Color, string> = {
  Y: DEFAULT_SCENE_LOOK.colors.Y,
  W: GRAY,
  G: DEFAULT_SCENE_LOOK.colors.G,
  B: DEFAULT_SCENE_LOOK.colors.B,
  R: DEFAULT_SCENE_LOOK.colors.R,
  O: DEFAULT_SCENE_LOOK.colors.O,
};
const STICKER_STARTS = [0, 3, 9, 15, 21];
const STICKER_SIZES = [3, 6, 6, 6, 3];
const GROUT_GAP = 0.6;

const OLL_GROUPS: LastLayerGroup[] = [
  {
    look: "1st",
    isGrayed: (color, isCorner) => isCorner || color !== "Y",
    cases: [
      { name: "Dot", fullName: "OLL 2", alg: "R U' R2 D' r U r' D R2 U R'" },
      { name: "Line", fullName: "OLL 45", alg: "F R U R' U' F'" },
      { name: "Angle", fullName: "OLL 44", alg: "F U R U' R' F'" },
    ],
  },
  {
    look: "2nd",
    isGrayed: (color) => color !== "Y",
    cases: [
      { name: "Sune", fullName: "OLL 27", alg: "R U R' U R U2 R'" },
      { name: "Antisune", fullName: "OLL 26", alg: "R' U' R U' R' U2 R" },
      { name: "H", fullName: "OLL 21", alg: "R U2 R' U' R U R' U' R U' R'" },
      { name: "L", fullName: "OLL 25", alg: "F R' F' r U R U' r'", auf: "U'" },
      { name: "Pi", fullName: "OLL 22", alg: "R U2 R2 U' R2 U' R2 U2 R", auf: "U'" },
      { name: "T", fullName: "OLL 24", alg: "r U R' U' r' F R F'", auf: "U" },
      { name: "U", fullName: "OLL 23", alg: "R2 D' R U2 R' D R U2 R" },
    ],
  },
];

const PLL_GROUPS: LastLayerGroup[] = [
  {
    look: "1st",
    isGrayed: (color, isCorner) => !isCorner && color !== "Y",
    cases: [
      {
        name: "Adjacent",
        fullName: "J",
        alg: "R U R' F' R U R' U' R' F R2 U' R'",
        callouts: [{ boxes: [LEFT_SIDE], lines: ["headlights"], side: "left", leaderStart: LEFT_MIDDLE }],
      },
      {
        name: "Diagonal",
        fullName: "Y",
        alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
        callouts: [{ boxes: ALL_SIDES, lines: ["no", "headlights"], side: "right", leaderStart: RIGHT_MIDDLE, dashed: true }],
      },
    ],
  },
  {
    look: "2nd",
    isGrayed: () => false,
    cases: [
      {
        name: "-",
        fullName: "H",
        alg: "M2 U M2 U2 M2 U M2",
        callouts: [{ boxes: ALL_SIDES, lines: ["edge colors", "opposite"], side: "right", leaderStart: RIGHT_MIDDLE }],
      },
      {
        name: "-",
        fullName: "Ua",
        alg: "R U R' U R' U' R2 U' R' U R' U R",
        auf: "U2",
        callouts: [
          BAR_CALLOUT,
          { boxes: [LEFT_SIDE], lines: ["edge color", "adjacent"], side: "left", leaderStart: LEFT_MIDDLE },
        ],
      },
      {
        name: "-",
        fullName: "Ub",
        alg: "R' U R' U' R3 U' R' U R U R2",
        auf: "U2",
        callouts: [
          BAR_CALLOUT,
          { boxes: [LEFT_SIDE], lines: ["edge color", "opposite"], side: "left", leaderStart: LEFT_MIDDLE },
        ],
      },
      {
        name: "-",
        fullName: "Z",
        alg: "M' U' M2 U' M2 U' M' U2 M2",
        callouts: [{ boxes: ALL_SIDES, lines: ["edge colors", "adjacent"], side: "right", leaderStart: RIGHT_MIDDLE }],
      },
    ],
  },
];

const OLL_LAYOUT: LastLayerLayout = {
  row: "grid-cols-[4.5rem_1fr_1fr]",
  diagramCell: "",
  diagramHeader: "",
  nameCell: "",
};

const PLL_LAYOUT: LastLayerLayout = {
  row: "grid-cols-2 @min-[34rem]:grid-cols-[minmax(0,1fr)_6rem_6rem] @min-[34rem]:pr-0",
  diagramCell: "order-last col-span-2 -mx-2 border-t border-neutral-500 px-2 pt-1.5 @min-[34rem]:order-none @min-[34rem]:col-span-1 @min-[34rem]:mx-0 @min-[34rem]:border-t-0 @min-[34rem]:px-0 @min-[34rem]:pt-0",
  diagramHeader: "hidden @min-[34rem]:block",
  nameCell: "@min-[34rem]:pl-4",
};

function lastLayerColors({ alg, auf = "" }: LastLayerCase) {
  const moves = [...parseScramble("x2"), ...cube3x3.invert(parseScramble(alg)), ...parseScramble(auf)];
  const [up, , front, right, back, left] = new SimpleCube().getCubeState(moves);
  return [
    [null, back[0][2], back[0][1], back[0][0], null],
    [left[0][0], ...up[0], right[0][2]],
    [left[0][1], ...up[1], right[0][1]],
    [left[0][2], ...up[2], right[0][0]],
    [null, ...front[0], null],
  ];
}

function CalloutMarks({ boxes, lines, side, leaderStart, dashed }: CaseCallout) {
  const direction = side === "left" ? -1 : 1;
  const iconEdgeX = side === "left" ? 0 : ICON_SIZE;
  const leaderEndX = iconEdgeX + direction * LEADER_LENGTH;
  const labelX = leaderEndX + direction * LABEL_GAP;
  const firstLineY = leaderStart.y - ((lines.length - 1) * LABEL_LINE_HEIGHT) / 2;

  return (
    <g>
      <g className="fill-none stroke-dark_accent" strokeWidth={0.6}>
        {boxes.map((box) => (
          <rect key={`${box.x}-${box.y}`} {...box} rx={0.8} strokeDasharray={dashed ? "1.6 1.2" : undefined} />
        ))}
        <line x1={leaderStart.x} y1={leaderStart.y} x2={leaderEndX} y2={leaderStart.y} />
      </g>
      {lines.map((line, i) => (
        <text
          key={line}
          x={labelX}
          y={firstLineY + i * LABEL_LINE_HEIGHT}
          textAnchor={side === "left" ? "end" : "start"}
          dominantBaseline="central"
          fontSize={LABEL_FONT_SIZE}
          className="fill-primary-100"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function CaseDiagram({ lastLayerCase, isGrayed }: { lastLayerCase: LastLayerCase; isGrayed: LastLayerGroup["isGrayed"] }) {
  const stickers = lastLayerColors(lastLayerCase).flatMap((line, row) => line.map((color, col) => {
    if (!color) return null;
    const isCorner = row !== 2 && col !== 2;
    return (
      <rect
        key={`${row}-${col}`}
        x={STICKER_STARTS[col] + GROUT_GAP}
        y={STICKER_STARTS[row] + GROUT_GAP}
        width={STICKER_SIZES[col] - 2 * GROUT_GAP}
        height={STICKER_SIZES[row] - 2 * GROUT_GAP}
        fill={isGrayed(color, isCorner) ? GRAY : STICKER_COLORS[color]}
      />
    );
  }));
  const { callouts } = lastLayerCase;
  const sideRoom = callouts ? CALLOUT_ROOM : ICON_MARGIN;
  const viewBox = `${-sideRoom} ${-ICON_MARGIN} ${ICON_SIZE + sideRoom * 2} ${ICON_SIZE + ICON_MARGIN * 2}`;

  return (
    <svg viewBox={viewBox} className={callouts ? "mx-auto w-full max-w-xs" : "w-full"}>
      <polygon points={ICON_BACKGROUND_POINTS} fill={ICON_BACKGROUND} />
      {stickers}
      {callouts?.map((callout) => <CalloutMarks key={callout.lines.join(" ")} {...callout} />)}
    </svg>
  );
}

const UA_PERM_SETUP = "R' U' R U' R U R2' U R U' R U' R'";
const UA_PERM_ANGLES = { x: 30, y: -30 };
const BOTTOM_LEFT_TEXT = { x: 2, y: 96, anchor: "bottom-left", duration: 2000 } as const;

const DOT_EXAMPLES: LastLayerCase[] = [
  { name: "Dot", fullName: "OLL 1", alg: "R U2 R2 F R F' U2 R' F R F'" },
  { name: "Dot", fullName: "OLL 20", alg: "r U R' U' M2 U R U' R' U' M'" },
];

function DotCaseExamples() {
  return (
    <figure className="mb-6 flex gap-4" role="img" aria-label="Two dot cases. One has no corners solved and the other has all four corners solved.">
      {DOT_EXAMPLES.map((dotCase) => (
        <div key={dotCase.fullName} className="w-18">
          <CaseDiagram lastLayerCase={dotCase} isGrayed={(color) => color !== "Y"} />
        </div>
      ))}
    </figure>
  );
}

function LastLayerDiagram({ groups, fullNameHeader, layout }: {
  groups: LastLayerGroup[];
  fullNameHeader: string;
  layout: LastLayerLayout;
}) {
  const rowGrid = `grid items-center gap-x-3 gap-y-1 rounded-[9px] border-[1.5px] px-2 ${layout.row}`;
  const groupSummaries = groups.map((group) => {
    const caseNames = group.cases.map(({ name, fullName }) => `${name} (${fullName})`).join(", ");
    return `${group.look} look: ${caseNames}.`;
  });

  return (
    <figure className="@container mb-6 max-w-xl" role="img" aria-label={groupSummaries.join(" ")}>
      <div className="flex flex-col gap-2">
        <div className="ml-10 border-[1.5px] border-transparent px-2">
          <div className={`${rowGrid} border-transparent text-sm font-bold text-primary-100`}>
            <span className={layout.diagramHeader}>Case</span>
            <span className={layout.nameCell}>Two-look name</span>
            <span>{fullNameHeader}<br />(or fastest comparable)</span>
          </div>
        </div>
        {groups.map((group) => (
          <div key={group.look} className="flex gap-2">
            <span className="w-8 self-center text-center text-sm font-bold text-primary-100">
              {group.look}<br />look
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[11px] border-[1.5px] border-dark_accent p-2">
              {group.cases.map((lastLayerCase) => (
                <div
                  key={lastLayerCase.fullName}
                  className={`${rowGrid} border-primary-500 bg-primary-700 py-1.5 text-sm text-primary-200`}
                >
                  <div className={layout.diagramCell}>
                    <CaseDiagram lastLayerCase={lastLayerCase} isGrayed={group.isGrayed} />
                  </div>
                  <span className={layout.nameCell}>{lastLayerCase.name}</span>
                  <span>{lastLayerCase.fullName}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
