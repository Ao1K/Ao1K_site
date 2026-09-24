import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";
import Story from "../LessonStory";
import LessonList from "../LessonList";
import ExternalLink from "../../ExternalLink";

export default function HowToLearn() {
  return (
    <>
      <TitleBar title="How to Learn" subtitle="Your journey starts here" audience="all" />
      <LessonBody>
        <Story storyParagraphs={[
          "Peaku is falling asleep at his desk. Papers surround him. His father wishes him to continue the artifact business, but the old ways are impossible to parse.",
          `A hand slaps him awake. "Brother," Jera says.`,
          `Peaku shakes himself. "Leave me be. I am almost done."`,
          `"It is pointless," Jera says.`,
          `"I am destined for greatness, am I not?"`,
          `"You are destined to forget everything. I know no potion that prevents sleep from taking your memories."`,
          `"I am not asleep."`,
          `Jera walks to bed. "I am only looking out for you. It is much more enjoyable to explore magic than to try to understand it like this. Stubborn cow."`,
          `"Cows are content to chew grass," Peaku says.`
        ]} />
        <p>{`Are you destined for greatness?`}</p>
        <p>{`Ambition is great, but it does need to be backed up with a lot of practice. Practice is most of cubing. The faster you get, the more you have to practice to get faster. You get to choose how fast you want to be.`}</p>
        <SolveTimeDecayGraph />
        <p>{`It's also important to have fun. If you stop having fun, you're more likely to not practice, and so you won't improve. But are practice and fun enough?`}</p>

        <h1>The learning cycle</h1>
        <Story storyParagraphs={[
          `"With the right chemistry, it activates. Look!" Jera waves the wand around, colors shifting on its surfaces. `,
          `Their footsteps ring where metal reaches from the ground. Peaku inspects a decaying tree amidst the greenery. Insects writhe through the crumbling wood. He has a bad feeling. "And what do you plan to do with it?" he asks.`,
          `"Experiment. Most wands are different. Most don't do anything."`,
          `"And you tell me my studies are pointless."`,
          `"Hush." Jera pokes at the wand's flat surface. Runes flash. "Fortune favors the bold. We keep trying, and the world reveals its secrets."`,
          `"If we are not picked apart by fairies."`,
          `"I said hush."`,
          `Peaku waits. He stares at trees and birds and contemplates his studies.`,
          `"I think I got it," Jera says at last.`,
          `Metal screeches. When Peaku looks back, Jera has vanished. A hole is in the ground where she once sat, but it is already closing up behind her.`,
          `He pries at where the entrance was. Her presence beats beside his own heart, growing more faint. She isn't gone entirely, but his strength just isn't enough to recover her. When his fingers are bloody and his body exhausted, he admits to himself he needs a new approach. `,
          `He walks home. His sister is stupid, foolhardy, but she said one true thing: you keep trying.`
        ]}/>

        <p>{`It is not enough to merely practice. A common trap cubers will fall into is practicing but not improving. Sometimes, undoubtedly, this is because they do not practice enough. But other times, it is because they practice the wrong things. Practice doesn't make perfect. It makes your habits more engrained, good or bad.`}</p>
        <p>{`But you also can't practice everything correctly right away. There would be too much to focus on. So instead you find something to learn, learn it, and then practice it in various ways. Then you repeat the cycle.`}</p>
        <LearningCycleDiagram />

        <h2>Finding things to learn</h2>
        <p>{`Never fall into the assumption that you have "mastered" a topic. There is always something to improve at.`}</p>
        <p>{`One of the key design philosophies of this lesson series is that it does not exist on its own. In many lessons, you will see links to other tutorials on the internet. You should also explore on your own. YouTube in particular is a great place to find tutorials and walkthroughs of solves. Good ideas can come from anywhere, but also try to take advice from people you trust.`}</p>
        <p>{`Here are some specific people worth checking out. Not a complete list!`}</p>
        <ol className="list-inside list-decimal text-base text-neutral-400 leading-relaxed sm:text-md space-y-2 mb-4 pb-4">
          <li>
            <ExternalLink href="https://www.youtube.com/@CubeHead" text="Cubehead" />
          </li>
          <li>
            <ExternalLink href="https://www.youtube.com/@JPerm" text="Jperm" />
          </li>
          <li>
            <ExternalLink href="https://www.youtube.com/@cubeskills" text="Cubeskills" />
            {` (Feliks Zemdegs)`}
          </li>
        </ol>
        <p>
          {`As you get faster, it might also benefit you to look at breakdowns (reconstructions) of fast people's solves. One of the largest collections of recons is at `}
          <ExternalLink href="https://reco.nz" text="reco.nz" />
          {`.`}
        </p>
        <p>{`The community itself is also a resource. When you have specific questions, people will love to help you. Just remember to play by their rules. And avoid asking for a free tutor.`}</p>
        <ol className="list-inside list-decimal text-base text-neutral-400 leading-relaxed sm:text-md space-y-2 mb-4 pb-4">
          <li>
            <ExternalLink href="https://www.reddit.com/r/Cubers/" text="reddit.com/r/cubers" />
          </li>
          <li>
            <ExternalLink href="https://www.speedsolving.com/forums/" text="speedsolving.com forum" />
          </li>
          <li>
            <ExternalLink href="https://discord.gg/cubers" text="Cubers discord server" />
          </li>
          <li>
            <ExternalLink href="https://discord.gg/cubehead" text="Cubehead discord server" />
          </li>
        </ol>
        <h2>Learning things</h2>
        <p>{`After you've immersed yourself in all this content, the next step is to actually learn something. Try not to get too caught up on this step. You won't be wasting much time if you learn things a bit out of order.`}</p>
        <p>{`Be sure to go through a tutorial all the way so you don't miss anything. Stay persistent, but when you get stuck, you may want to ask the community for help. Don't say:`}</p>
        <p><i>{`I'm stuck.`}</i></p>
        <p>{`Say:`}</p>
        <p><i>{`I was following `}<b>[tutorial]</b>{` and can't figure out how to do `}<b>[thing]</b>{`. Help?`}</i></p>
        {/* TODO: link to first alg tutorial */}
        <p>{`The best way to learn something changes depending on how you are and what you're learning. If you're learning algorithms (algs), there's all sorts of techniques you can use to make it go smoother. We'll talk more about these and other techniques when they become relevant.`}</p>
        <h2>Practicing</h2>
        {/* TODO: link to F2L tutorial */}
        <p>{`Practicing is how you remember and get fast at something. Without enough practice, that new thing you learned might actually make your times go up. But as you practice it more, your times should hopefully go down, and eventually they might even level off as you get truly familiar with it.`}</p>
        <LearningJumpsGraph />
        <p>{`This illustration is still oversimplified. There's a lot of randomness, and you might be working on several things at once. It can be hard to tell what's really going on. The good news is that practice can be a lot of fun.`}</p>
        <p>{`There's a few main ways to practice:`}</p>
        <LessonList items={['Doing algorithms repeatedly (also called drilling)', 'Partial solves', 'Untimed solves','Timed solves']} />
        {/* TODO: link to speed training tutorial, if we make one */}
        <p>{`Among other ways.`}</p>
        <p>{`The newer something is, the more it can be good to practice more slowly. Try to practice at the edge of your abilities. Not so fast you make mistakes constantly, but not so slow you make no mistakes.`}</p>
        <p>{`Alright, finally! Let's go learn CFOP! Wait, what is CFOP?`}</p>
      </LessonBody>
    </>
  );
}

const X_LABEL = "Number of solves";
const Y_LABEL = "Solve Time";

const LEARNED_LABEL = "Learned new thing";
const PRACTICED_LABEL = "Practiced thing";
const FAMILIAR_LABEL = "Familiar with thing";
const LEGEND_TITLE = "Legend";

const VIEW_WIDTH = 420;
const VIEW_HEIGHT = 190;
const PLOT_LEFT = 100;
const PLOT_RIGHT = 12;
const PLOT_TOP = 14;
const PLOT_BOTTOM = 42;

const PLOT_WIDTH = VIEW_WIDTH - PLOT_LEFT - PLOT_RIGHT;
const PLOT_HEIGHT = VIEW_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
const BASELINE = PLOT_TOP + PLOT_HEIGHT;

const DECAY_RATE = 3.6;
const ASYMPTOTE = 0.1;
const SAMPLE_COUNT = 80;

function toPlotX(progress: number) {
  return PLOT_LEFT + progress * PLOT_WIDTH;
}

function toPlotY(value: number) {
  return PLOT_TOP + (1 - value) * PLOT_HEIGHT;
}

function formatPoint(progress: number, value: number) {
  return `${toPlotX(progress).toFixed(2)},${toPlotY(value).toFixed(2)}`;
}

function decayCurvePoints() {
  return Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) => {
    const progress = index / SAMPLE_COUNT;
    const value = ASYMPTOTE + (1 - ASYMPTOTE) * Math.exp(-DECAY_RATE * progress);
    return formatPoint(progress, value);
  }).join(" ");
}

function GraphAxes() {
  return (
    <>
      <line
        x1={PLOT_LEFT}
        y1={PLOT_TOP}
        x2={PLOT_LEFT}
        y2={BASELINE}
        className="stroke-primary-600"
        strokeWidth={1}
      />
      <line
        x1={PLOT_LEFT}
        y1={BASELINE}
        x2={PLOT_LEFT + PLOT_WIDTH}
        y2={BASELINE}
        className="stroke-primary-600"
        strokeWidth={1}
      />
      <text
        x={PLOT_LEFT + PLOT_WIDTH / 2}
        y={VIEW_HEIGHT - 12}
        textAnchor="middle"
        className="fill-primary-100 text-md"
      >
        {X_LABEL}
      </text>
      <text
        x={42}
        y={VIEW_HEIGHT - 100}
        textAnchor="middle"
        className="fill-primary-100 text-md"
      >
        {Y_LABEL}
      </text>
    </>
  );
}

function GraphFigure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <figure className="mb-4 flex flex-col items-center sm:mx-10 rounded-sm">
      <figcaption className="mb-2 text-md font-semibold text-primary-100">{title}</figcaption>
      {children}
    </figure>
  );
}

function SolveTimeDecayGraph() {
  return (
    <GraphFigure title="Improvement Curve (Version 1)">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="w-full"
        style={{ maxWidth: VIEW_WIDTH }}
        role="img"
        aria-label={`${Y_LABEL} against ${X_LABEL}: a curve that falls steeply at first, then flattens out.`}
      >
        <GraphAxes />
        <polyline
          points={decayCurvePoints()}
          fill="none"
          className="stroke-dark_accent"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    </GraphFigure>
  );
}

type LearningPhase = {
  learnedAt: number;
  jump: number;
  settlesTo: number;
  practiceSpan?: number;
  settleRate?: number;
};

type PracticeSegment = {
  learnedAt: number;
  start: number;
  end: number;
  from: number;
  to: number;
  practiceSpan: number;
  settleRate: number;
};

type LegendSwatch = "learned" | "practiced" | "familiar";

type LegendItem = {
  label: string;
  swatch: LegendSwatch;
};

const FIRST_LEARNED_AT = 0.01;
const FIRST_SOLVE_TIME = 1;
const FIRST_PLATEAU = 0.62;
const FIRST_PRACTICE_SPAN = 0.23;

const LEARNING_PHASES: LearningPhase[] = [
  { learnedAt: 0.27, jump: 0.3, settlesTo: 0.4, practiceSpan: 0.26, settleRate: 2.5 },
  { learnedAt: 0.53, jump: 0.04, settlesTo: 0.33 },
  { learnedAt: 0.79, jump: 0.05, settlesTo: 0.12 },
];

const LEARNED_DURING_PRACTICE_AT = [0.4];

const JUMP_RISE = 0.006;
const PRACTICE_SPAN = 0.2;
const SETTLE_RATE = 4;
const SEGMENT_SAMPLE_COUNT = 40;

const LEGEND_ITEMS: LegendItem[] = [
  { label: LEARNED_LABEL, swatch: "learned" },
  { label: PRACTICED_LABEL, swatch: "practiced" },
  { label: FAMILIAR_LABEL, swatch: "familiar" },
];

const PRACTICED_FILL = "fill-primary-500/30";

const LEGEND_CHAR_WIDTH = 7.2;
const LEGEND_SWATCH_SIZE = 14;
const LEGEND_TEXT_GAP = 8;
const LEGEND_ROW_GAP = 8;
const LEGEND_PADDING = 12;
const LEGEND_TITLE_GAP = 10;
const LEGEND_STROKE_INSET = 0.5;
const LEGEND_TITLE_TOP = LEGEND_PADDING;
const LEGEND_ITEMS_TOP = LEGEND_TITLE_TOP + LEGEND_SWATCH_SIZE + LEGEND_TITLE_GAP;
const LEGEND_ROWS_HEIGHT =
  LEGEND_ITEMS.length * LEGEND_SWATCH_SIZE + (LEGEND_ITEMS.length - 1) * LEGEND_ROW_GAP;
const LEGEND_BOX_HEIGHT = LEGEND_ITEMS_TOP + LEGEND_ROWS_HEIGHT + LEGEND_PADDING;

function legendItemWidth(item: LegendItem) {
  return LEGEND_SWATCH_SIZE + LEGEND_TEXT_GAP + item.label.length * LEGEND_CHAR_WIDTH;
}

const LEGEND_BOX_WIDTH =
  Math.max(LEGEND_TITLE.length * LEGEND_CHAR_WIDTH, ...LEGEND_ITEMS.map(legendItemWidth)) +
  LEGEND_PADDING * 2;
const LEGEND_RIGHT_ROOM = 4;
const LEGEND_VIEW_WIDTH = LEGEND_BOX_WIDTH + LEGEND_RIGHT_ROOM;

function toGraphWidthShare(length: number) {
  return `${(length / VIEW_WIDTH) * 100}%`;
}

const GRAPH_WITH_LEGEND_SIZES = {
  "--graph-width": `${VIEW_WIDTH}px`,
  "--legend-width": `${LEGEND_VIEW_WIDTH}px`,
  "--legend-width-share": toGraphWidthShare(LEGEND_VIEW_WIDTH),
  "--legend-right-share": toGraphWidthShare(PLOT_RIGHT - LEGEND_RIGHT_ROOM),
} as React.CSSProperties;

function legendRowTop(index: number) {
  return LEGEND_ITEMS_TOP + index * (LEGEND_SWATCH_SIZE + LEGEND_ROW_GAP);
}

function legendTextBaseline(rowTop: number) {
  return rowTop + LEGEND_SWATCH_SIZE - 2;
}

function segmentValue(segment: PracticeSegment, progress: number) {
  const elapsedSpans = (progress - segment.start) / segment.practiceSpan;
  return segment.to + (segment.from - segment.to) * Math.exp(-segment.settleRate * elapsedSpans);
}

function practiceSegments() {
  const firstSegment: PracticeSegment = {
    learnedAt: FIRST_LEARNED_AT,
    start: FIRST_LEARNED_AT,
    end: LEARNING_PHASES[0].learnedAt,
    from: FIRST_SOLVE_TIME,
    to: FIRST_PLATEAU,
    practiceSpan: FIRST_PRACTICE_SPAN,
    settleRate: SETTLE_RATE,
  };
  return LEARNING_PHASES.reduce<PracticeSegment[]>(
    (segments, phase, index) => {
      const previous = segments[segments.length - 1];
      const timeWhenLearned = segmentValue(previous, phase.learnedAt);
      const nextPhase = LEARNING_PHASES[index + 1];
      segments.push({
        learnedAt: phase.learnedAt,
        start: phase.learnedAt + JUMP_RISE,
        end: nextPhase ? nextPhase.learnedAt : 1,
        from: timeWhenLearned + phase.jump,
        to: phase.settlesTo,
        practiceSpan: phase.practiceSpan ?? PRACTICE_SPAN,
        settleRate: phase.settleRate ?? SETTLE_RATE,
      });
      return segments;
    },
    [firstSegment]
  );
}

function learningCurvePoints(segments: PracticeSegment[]) {
  return segments
    .flatMap((segment) =>
      Array.from({ length: SEGMENT_SAMPLE_COUNT + 1 }, (_, index) => {
        const progress = segment.start + (index / SEGMENT_SAMPLE_COUNT) * (segment.end - segment.start);
        return formatPoint(progress, segmentValue(segment, progress));
      })
    )
    .join(" ");
}

function LearnedMarker({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <line
      x1={x}
      y1={y1}
      x2={x}
      y2={y2}
      className="stroke-primary-300"
      strokeWidth={1.5}
      strokeDasharray="4 3"
    />
  );
}

function LearningJumpsGraph() {
  const segments = practiceSegments();
  return (
    <GraphFigure title="Improvement Curve (Version 2)">
      <div
        className="flex w-full max-w-(--graph-width) flex-col items-end lg:max-w-none lg:flex-row lg:items-center lg:justify-center lg:gap-4"
        style={GRAPH_WITH_LEGEND_SIZES}
      >
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="w-full lg:min-w-0 lg:flex-1"
          style={{ maxWidth: VIEW_WIDTH }}
          role="img"
          aria-label={`${Y_LABEL} against ${X_LABEL}: each time something new is learned, solve time jumps up, then practice brings it down below where it was before. The jumps mostly get smaller as solve time gets lower, and one new thing barely causes a jump at all.`}
        >
          {segments.map((segment) => (
            <rect
              key={`practice-${segment.learnedAt}`}
              x={toPlotX(segment.learnedAt)}
              y={PLOT_TOP}
              width={segment.practiceSpan * PLOT_WIDTH}
              height={PLOT_HEIGHT}
              className={PRACTICED_FILL}
            />
          ))}
          {[...segments.map((segment) => segment.learnedAt), ...LEARNED_DURING_PRACTICE_AT].map((learnedAt) => (
            <LearnedMarker
              key={`learned-${learnedAt}`}
              x={toPlotX(learnedAt)}
              y1={PLOT_TOP}
              y2={BASELINE}
            />
          ))}
          <GraphAxes />
          <polyline
            points={learningCurvePoints(segments)}
            fill="none"
            className="stroke-dark_accent"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <LearningLegend />
      </div>
    </GraphFigure>
  );
}

function LegendSwatchMark({ swatch, x, y }: { swatch: LegendSwatch; x: number; y: number }) {
  if (swatch === "learned") {
    return (
      <LearnedMarker
        x={x + LEGEND_SWATCH_SIZE / 2}
        y1={y}
        y2={y + LEGEND_SWATCH_SIZE}
      />
    );
  }
  return (
    <rect
      x={x}
      y={y}
      width={LEGEND_SWATCH_SIZE}
      height={LEGEND_SWATCH_SIZE}
      className={swatch === "practiced" ? PRACTICED_FILL : "fill-primary-900 stroke-primary-600"}
      strokeWidth={1}
    />
  );
}

function LearningLegend() {
  const itemX = LEGEND_PADDING;
  return (
    <svg
      viewBox={`0 0 ${LEGEND_VIEW_WIDTH} ${LEGEND_BOX_HEIGHT}`}
      className="mt-3.5 mr-(--legend-right-share) w-(--legend-width-share) shrink-0 lg:mt-0 lg:mr-0 lg:w-(--legend-width)"
      aria-hidden
    >
      <rect
        x={LEGEND_STROKE_INSET}
        y={LEGEND_STROKE_INSET}
        width={LEGEND_BOX_WIDTH - LEGEND_STROKE_INSET * 2}
        height={LEGEND_BOX_HEIGHT - LEGEND_STROKE_INSET * 2}
        rx={4}
        fill="none"
        className="stroke-primary-600"
        strokeWidth={1}
      />
      <text
        x={itemX}
        y={legendTextBaseline(LEGEND_TITLE_TOP)}
        className="fill-primary-100 text-md font-semibold"
      >
        {LEGEND_TITLE}
      </text>
      {LEGEND_ITEMS.map((item, index) => (
        <g key={item.label}>
          <LegendSwatchMark swatch={item.swatch} x={itemX} y={legendRowTop(index)} />
          <text
            x={itemX + LEGEND_SWATCH_SIZE + LEGEND_TEXT_GAP}
            y={legendTextBaseline(legendRowTop(index))}
            className="fill-primary-100 text-md"
          >
            {item.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

type CycleNode = {
  label: string;
  x: number;
  y: number;
};

const CYCLE_VIEW_WIDTH = 440;
const CYCLE_VIEW_HEIGHT = 200;

const CYCLE_NODES: CycleNode[] = [
  { label: "Find things to learn", x: 100, y: 42 },
  { label: "Learn something", x: 340, y: 42 },
  { label: "Practice that thing", x: 220, y: 160 },
];

const LABEL_CHAR_WIDTH = 7.2;
const LABEL_PADDING_X = 14;
const BOX_HALF_HEIGHT = 17;
const BOX_CORNER_RADIUS = 9;
const ARROW_HEAD_GAP = 9;

function boxHalfWidth(label: string) {
  return (label.length * LABEL_CHAR_WIDTH) / 2 + LABEL_PADDING_X;
}

function distanceToBoxEdge(node: CycleNode, unitX: number, unitY: number) {
  const horizontal = unitX === 0 ? Infinity : boxHalfWidth(node.label) / Math.abs(unitX);
  const vertical = unitY === 0 ? Infinity : BOX_HALF_HEIGHT / Math.abs(unitY);
  return Math.min(horizontal, vertical);
}

function cycleArrows() {
  return CYCLE_NODES.map((from, index) => {
    const to = CYCLE_NODES[(index + 1) % CYCLE_NODES.length];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const unitX = (to.x - from.x) / length;
    const unitY = (to.y - from.y) / length;
    const startOffset = distanceToBoxEdge(from, unitX, unitY) + ARROW_HEAD_GAP;
    const endOffset = distanceToBoxEdge(to, unitX, unitY) + ARROW_HEAD_GAP;
    return {
      key: from.label,
      x1: from.x + unitX * startOffset,
      y1: from.y + unitY * startOffset,
      x2: to.x - unitX * endOffset,
      y2: to.y - unitY * endOffset,
    };
  });
}

function LearningCycleDiagram() {
  return (
    <figure className="mb-4 flex justify-center">
      <svg
        viewBox={`0 0 ${CYCLE_VIEW_WIDTH} ${CYCLE_VIEW_HEIGHT}`}
        className="w-full max-w-sm"
        role="img"
        aria-label={CYCLE_NODES.map((node) => node.label).join(", then ") + ", then back to the start."}
      >
        <defs>
          <marker
            id="learning-cycle-arrow"
            viewBox="0 0 6 6"
            refX={5}
            refY={3}
            markerWidth={5}
            markerHeight={5}
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" className="fill-dark_accent" />
          </marker>
        </defs>
        {cycleArrows().map((arrow) => (
          <line
            key={arrow.key}
            x1={arrow.x1}
            y1={arrow.y1}
            x2={arrow.x2}
            y2={arrow.y2}
            className="stroke-dark_accent"
            strokeWidth={2}
            strokeLinecap="round"
            markerEnd="url(#learning-cycle-arrow)"
          />
        ))}
        {CYCLE_NODES.map((node) => (
          <g key={node.label}>
            <rect
              x={node.x - boxHalfWidth(node.label)}
              y={node.y - BOX_HALF_HEIGHT}
              width={boxHalfWidth(node.label) * 2}
              height={BOX_HALF_HEIGHT * 2}
              rx={BOX_CORNER_RADIUS}
              className="fill-primary-700 stroke-primary-500"
              strokeWidth={1.5}
            />
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              className="fill-primary-100 text-md"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
