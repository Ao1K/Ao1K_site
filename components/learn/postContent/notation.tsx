import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";
import Story from "../LessonStory";
import LessonLink from "../LessonLink";
import LessonList from "../LessonList";
import CubeScene from "../CubeScene";
import { H1, H2 } from "../LessonHeading"
import FurtherLearning, { Citation, type Source } from "../FurtherLearning";

const SOURCES = [
  {
    id: "4x4-beginner",
    title: "Beginner's method for solving the 4x4 (including notation)",
    attribution: "by Feliks Zemdegs",
    href: "https://cubeskills.com/uploads/pdf/tutorials/beginners-method-for-solving-the-4x4-cube.pdf",
  },
  {
    id: "jperm-notation",
    title: "Simple notation guide",
    attribution: "by J Perm",
    href: "https://jperm.net/3x3/moves",
  },
  {
    id: "wca-notation",
    title: "Official Notation",
    attribution: "by the World Cube Association",
    href: "https://www.worldcubeassociation.org/regulations/#article-12-notation",
  },
] as const satisfies readonly Source[];

export default function Notation() {
  return (
    <>
      <TitleBar title="Notation" subtitle="" audience="all" />
      <LessonBody>
        <Story storyParagraphs={[
          `They eat mashed grains beside beats and a little pork. Yamison passes him yet another book. "There is a gap in your studies," he says.`,
          `The book promises to teach the reader what is known of the most common old language, the one used by the original magicians.`,
          `Peaku shrugs at it. "This was Jera's focus."`,
          `"You will learn it too."`,
          `"She said she hated it."`,
          `"Yes, and you will learn it too."`,
          `Peaku says nothing, chews the tough pork longer than necessary.`,
          `"There's much we don't know, and we might not have much time. Your father is... I fear your father will wish you gone from the village."`,
          `Peaku stops chewing.`,
          `"But our language comes from ours. You can understand much of it from just a few rules."`,
          `"Fine. Please show me."`
        ]}/>
        <p>{`Cubing notation is a compact way to write about how we turn the cube. With enough practice, using notation becomes second-nature.`}</p>
        <p>{`Notation makes it easier to learn algorithms. You can also then use computer-generated scrambles, ensuring you can quickly and thoroughly mix up the cube between solves.`}</p>
        
        <H1>Rule 1: Faces get letters</H1>
        <p>{`There are six faces on a traditional cube. The first rule is that each face gets assigned a letter.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Click and drag to rotate the cube</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <CubeScene
                facelets="WWWWWWWWWYYYYYYYYYGGGGGGGGGRRRRRRRRRBBBBBBBBBOOOOOOOOO"
                angles={{ x: 40, y: 45 }}
                labels
                lines={[{ moves: [], highlight: [] }]}
                startHighlighted
                orbit
                dim={1}
                shade={"#666666"}
              />
            </div>
          </div>
        </div>
        <p>{`The letters don't correspond to any colors on the cube. `}<code>U</code>{` just means the face that's on top at that moment, `}<code>F</code>{` just means the face that's facing you, and so on:`}</p>
        <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-2 mb-4">
          <code>U</code><span>=</span><span>Turn the<b> Up </b>face</span>
          <code>D</code><span>=</span><span>Turn the<b> Down </b>face</span>
          <code>F</code><span>=</span><span>Turn the<b> Front </b>face</span>
          <code>B</code><span>=</span><span>Turn the<b> Back </b>face</span>
          <code>L</code><span>=</span><span>Turn the<b> Left </b>face</span>
          <code>R</code><span>=</span><span>Turn the<b> Right </b>face</span>
        </div>
        <p>{`Okay great, but if you see an algorithm with a `}<code>U</code>{`, which way do you turn the Up face?`}</p>
        <H1>Rule 2: Modifiers give direction</H1>
        <p>{`After one of these letters, you'll sometimes see modifiers. For example, you might see `}<code>U2</code>{` or `}<code>{`F'`}</code>{`. We call that apostrophe symbol "prime", so you say that move `}<code>F'</code>{` as "F prime". Moves with the `}<code>2</code>{` are sometimes called double moves.`}</p>
        <p>{`What do the 2 and the prime symbol mean?`}</p>
        <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-2 mb-4">
          <code>'</code><span>=</span><span>Turn the face 90 degrees counterclockwise</span>
          <code>2</code><span>=</span><span>Turn the face twice, 180 degrees. Clockwise and counterclockwise do the same thing.</span>
          <code>{ }</code><span>=</span><span>If there's no modifier, turn the face 90 degrees clockwise</span>
        </div>
        <p>{`The clockwise and counterclockwise directions are relative to the cube `}<b>as if you were facing that side</b>{`. For that reason, `}<code>U</code>{` and `}<code>D</code>{` appear to go in opposite directions. Same for `}<code>R</code>{` and `}<code>L</code>{` and `}<code>F</code>{` and `}<code>B</code>:</p>
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-sm font-bold">{`Turn directions (alg shown: "U D R L F B")`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="B' F' L' R' D' U'"
              hints
              labels
              lines={[
                { moves: [["U", "D"], ["R", "L"], ["F", "B"]], durations: [2000, 2000, 2000], delay: 150 }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`You'll sometimes see the modifier `}<code>{`2'`}</code>{` as well. `}<code>{`2'`}</code>{` means you turn the face twice counterclockwise. You would think this would mean that `}<code>2</code>{`without the prime symbol would mean you turn clockwise, but this isn't always true. Humans are lazy, and sometimes choose not to write out `}<code>{`2'`}</code>{` when they could.`}</p>
        <p>{`The difference is just about fingertricks. This will be covered in the fingertricks lesson.`}</p>
        <H2>Example</H2>
        <p>For example,<code>{`R U2' R'`}</code> means:</p>
        <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-2 mb-4">
          <code>R</code><span>=</span><span>Turn the Right face clockwise</span>
          <code>U2'</code><span>=</span><span>Turn the Up face twice counterclockwise</span>
          <code>R'</code><span>=</span><span>Turn Right face counterclockwise</span>
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-sm font-bold">{`Modifiers example (alg shown: R U2' R')`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="x2 R U2 R'"
              hints
              labels
              lines={[
                { moves: ["R", "U2", "R'"], durations: [2000, 3000, 2000], delay: 150 }
              ]}
              progress
            />
          </div>
        </div>
        <H2>Special modifiers</H2>
        <p>{`Sometimes you'll see moves modified with `}<code>*</code>{`, such as `}<code>R*</code>{`.  This means the move could be in any direction (`}<code>{`R`}</code>{`,`}<code>{`R'`}</code>{`, or `}<code>{`R2'`}</code>{`)  because whatever is being discussed is true regardless of which direction the move goes in.`}</p>
        <p>{`Very, very rarely, you'll see `}<code>{`3 `}</code>{` or `}<code>{`3'`}</code>{` used as modifiers. These aren't normally used because it's faster to turn a cube one time in one direction than three times in the opposite direction.`}</p>
        <p>{`But sometimes, the cuber's wrist will be in such a weird grip that it's easier to turn the face 270 degrees, like in this algorithm:`}</p>
        <p><code>R' U R' U' R3 U' R' U R U R2</code></p>
        {/* TODO: confirm we mention it */}
        {/* <p>{`We'll talk more about this alg when we talk about full PLL.`}</p> */}
        <H1>Rule 3: Lowercase means wide</H1>
        <p>{`If the face letters `}<code>{`U D R L F B`}</code>{` are written in lowercase `}<code>{`u d r l f b`}</code>{`, that means turn two layers of the cube instead of one.`}</p>
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-sm font-bold">{`Wide move example (alg shown: r U' r')`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="r U r'"
              hints
              labels
              lines={[
                { moves: ["r", "U'", "r'"], durations: [2000, 2000, 2000], delay: 150 }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`You will sometimes see wide moves written with a "w". `}<code>r</code>{` and `}<code>Rw</code>{` mean the same thing.`}</p>
        <p>{`This wide move notation only applies for 3x3 cubes. 4x4 cubes use different notation.`}<Citation sources={SOURCES} id="4x4-beginner" /></p>
        <Story storyParagraphs={[
          `Peaku's plate sits scraped clean. Candles flicker. Yamison yawns and stands.`,
          `"I thought you said this would be quick," Peaku says.`,
          `"No. I said it would be just a few rules."`
        ]}/>
        <H1>Rule 4: Rotations get xyz</H1>
        <p>{`There's also a way to say "turn all three layers." We call that a cube rotation. Cube rotations get the letters `}<code>x</code>{`, `}<code>y</code>,{' and '}<code>z</code>{`. They're always written lowercase.`}</p>
        <p>{`It can be tricky to remember which way `}<code>x</code>,<code>y</code>,{' and '}<code>z</code>{` go. Just remember the following: `}<b>"xyz follows RUF"</b>{`. This means `}<code>{`x'`}</code>{` rotations are like doing an `}<code>{`R'`}</code>{` or `}<code>{`r'`}</code>{` move but with three layers instead of one or two.`}</p>
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-sm font-bold">{`Rotations (alg shown: R x U y F z)`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="z' F' y' U' x' R'"
              hints
              labels
              lines={[
                { moves: ["R", "x", "U", "y", "F", "z"], durations: [1500, 1500, 1500, 1500, 1500, 1500], delay: 150 }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`What would it mean to do `}<code>y2'</code>?</p>
        <input type="checkbox" id="notation1-answer" className="hidden peer/notation1" />
        <label htmlFor="notation1-answer" className="inline-block peer-checked/notation1:hidden cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
          Click to reveal the answer
        </label>
        <label htmlFor="notation1-answer" className="hidden peer-checked/notation1:inline-block cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
          Click to hide the answer
        </label>
        <div className="opacity-0 peer-checked/notation1:opacity-100 transition-opacity duration-500 text-neutral-400 mb-4">
          {`y2' means you rotate the entire cube 180 degrees in the same direction as U'.`}
        </div>
        <H1>Rule 5: Slices get MES</H1>
        <p>{`Slice moves turn the center layers:`}</p>
        <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-2 mb-4">
          <code>M</code><span>=</span><span>Turn the center (middle) layer in the <code>L</code> direction</span>
          <code>E</code><span>=</span><span>Turn the center (equator) layer in the <code>D</code> direction</span>
          <code>S</code><span>=</span><span>Turn the center (slice) layer in the <code>F</code> direction</span>
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-sm font-bold">{`Slices (alg shown: L M D E F S)`}</span>
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            <CubeScene
              scramble="S' F' E' D' M' L'"
              hints
              labels
              lines={[
                { moves: ["L", "M", "D", "E", "F", "S"], durations: [1500, 1500, 1500, 1500, 1500, 1500], delay: 150 }
              ]}
              progress
            />
          </div>
        </div>
        <p>{`You can remember these as `}<b>"MES follows LDF"</b>{`. Or you can remember that each slice move follows the letter of the layer that's closer to it in the alphabet. For example, the letter L is closer to the letter M than R is, so `}<code>M</code>{` follows `}<code>L</code>.</p>
        <H1>Rule 6: Parentheses mean groups</H1>
        <p>{`Final one. Occasionally, you will see moves grouped together using parenthesis like this:`}</p>
        <p><code>{`F R U R' U' F`}</code><span className="text-4xl leading-0">{` → `}</span><code>{`F (R U R' U') F`}</code></p>
        <p>{`In the example above, nothing changes. The moves are simply grouped together because `}<code>{`R U R' U'`}</code>{` is a common sequence. It can sometimes be useful to group common fast sequences (called "triggers") because it can make an algorithm slightly easier to memorize.`}</p>
        <p>{`Sometimes though, the grouping is used to tell you to repeat a grouping X number of times. For example:`}</p>
        <p><code>{`(R U' R' U)3`}</code></p>
        <p>{`This means do `}<code>{`R U' R' U`}</code>{` three times.`}</p>
        <FurtherLearning sources={SOURCES} />
      </LessonBody>
    </>
  );
}
