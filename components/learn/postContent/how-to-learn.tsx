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
        <p>{`Practicing is how you remember and get fast at something. Without practice, that new thing you learned will feel slow. This is the common pitfall with learning F2L. It might take a lot of practice to make F2L faster than some easier technique.`}</p>
        <p>{`In general, there's a few ways to practice:`}</p>
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

function decayCurvePoints() {
  return Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) => {
    const progress = index / SAMPLE_COUNT;
    const value = ASYMPTOTE + (1 - ASYMPTOTE) * Math.exp(-DECAY_RATE * progress);
    const x = PLOT_LEFT + progress * PLOT_WIDTH;
    const y = PLOT_TOP + (1 - value) * PLOT_HEIGHT;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function SolveTimeDecayGraph() {
  return (
    <figure className="mb-4 flex justify-center">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="w-full max-w-sm"
        role="img"
        aria-label={`${Y_LABEL} against ${X_LABEL}: a curve that falls steeply at first, then flattens out.`}
      >
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
        <polyline
          points={decayCurvePoints()}
          fill="none"
          className="stroke-dark_accent"
          strokeWidth={2}
          strokeLinecap="round"
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
      </svg>
    </figure>
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
