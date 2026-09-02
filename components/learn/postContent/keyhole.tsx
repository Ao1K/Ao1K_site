import LessonList from "../LessonList";
import LessonBody from "../LessonBody";
import Story from "../LessonStory";
import TitleBar from "../TitleBar";
import CubeScene from "../CubeScene";

const START_1_FACELETS = "OBRBYBGOOWWBWWWWWWYGWOOGOOYBOGRBYRBRYRBGRYGRBYYORGYRGG";
const START_2_FACELETS = "RBRBYBRRRGWWWWWBWWGYGGGOOGOYRBYOGBOGWYYYBOOBOBOWGRRYRY";
const CORNER_CASE_FACELETS = "OGOGYGOOOBWWWWWGWWBYBBBRRBRYOGYRBGRBWYYYGRRGRGRWBOOYOY";
const EDGE_CASE_FACELETS = "ROGRYBYGOWWWWWWWWGOYBBBYBBBYRYBRGRRWRYYRGGRGGBYGOOOOOO";
const HARD_CASE_FACELETS = "GBOBYORBYWWWWWWBWBYRGGRYGRBOYBRGGRGWYYWOOGOOYOOGRBYRBR";

const SOLVED = ["W", "Y", "G", "R", "B", "O", "WG", "WR", "WB", "WO"];

function Start1Scene() {
  return (
    <CubeScene
      facelets={START_1_FACELETS}
      angles={{ x: 30, y: 0 }}
      hints
      lines={[
        { moves: ["D'", "L'", "U", "L", "D"], durations: [640, 640, 640, 640, 640], delay: 800, highlight: [...SOLVED, "GO", "WGO"] }
      ]}
      progress
    />
  );
}

function Start2Scene() {
  return (
    <CubeScene
      facelets={START_2_FACELETS}
      angles={{ x: 30, y: 0 }}
      hints
      lines={[
        { moves: ["D", "R", "U'", "R'", "D'"], durations: [640, 640, 640, 640, 640], delay: 800, highlight: [...SOLVED, "GR", "WGR"] }
      ]}
      progress
    />
  );
}

export default function Keyhole() {
  return (
    <>
    <TitleBar title="Keyhole" subtitle="" seconds={50}></TitleBar>
    <LessonBody>
      <p>{`Keyhole is a technique. It lets you solve certain F2L cases quickly and without much risk.`}</p>
      <p>{`Sometimes, a quick example or two is enough to understand a concept. Here's a couple solutions that use keyhole:`}</p>
      <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
        <div className="w-80 h-80 mb-2  border border-neutral-400 rounded-sm overflow-hidden">
          <Start1Scene />
        </div>
        <div className="w-80 h-80 mb-2  border border-neutral-400 rounded-sm overflow-hidden">
          <Start2Scene />
        </div>
      </div>
      <p>{`Don't quite get it? Don't worry, we'll go over everything. Even if this does make sense, you might benefit from reading on. There's a lot more ways to use keyhole than just these two examples.`}</p>
      <Story storyParagraphs={[`There is a long road. Peaku has been walking all day in a light rain. He has just left the familiar behind. The path is rough and muddy, and that is to say nothing of the bugs.`, `The path turns steep. He slips through rocks and mud. He is in pain, and although he can stand easily, he does not.`, `A green bird lands on his mud-covered chest. A jewel in the rough. It screams out a mocking laugh.`,`What do you want, bird, Peaku says.`,`Watch you suffer! the bird says.`,`"What?"`,`The bird mocks him and flies off a short ways. It looks back at Peaku. Peaku stands and follows, weary of traps or evil creatures.`, `No such dangers appear. The bird perches on a dry log under a small rocky overhang. It hops, flutters the wet off its wings. Snack! it squawks.`, `Peaku drops his pack and sits down heavily. He offers the bird some nuts from his palm. It is a messy eater and finishes them off quickly.`,`Progress! Progress! it says.`, `Progress, Peaku agrees. 🦜`]}/>
      <p>{`Often, it can be hard to know when you're solving an F2L pair perfectly. When you get to use keyhole, you'll pretty much know you're making progress. Any other way you could solve it will almost always be worse.`}</p>
      <h1>When to use keyhole</h1>
      <p>{`You can use keyhole whenever these things are true:`}</p>
      <LessonList items={["There is an F2L pair where one piece is solved and the other piece is in the top layer, and", "There is another slot that isn't solved"]}/>
      <p>{`A "slot" is the location where a corner and edge piece need to get solved in the first and second layer. There's usually four unsolved slots after you solve cross.`}</p>
      <p>{`Let's look at those keyhole examples again.`}</p>
      <div className="flex flex-row flex-wrap gap-8 pb-6 mb-6 pt-2 border border-neutral-400 rounded-sm p-4">
        <div className="w-80 h-80 -mb-2 mt-2 border border-neutral-400 rounded-sm overflow-hidden">
          <Start1Scene />
        </div>
        <div className="flex flex-col py-4 min-w-50 w-[45%]">
          <p>This is a keyhole case because:</p>
            <LessonList items={["The green-orange-white corner is solved and the green-orange edge is in the top layer, and", "The front right slot is unsolved" ]}/>
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-8 pb-6 mb-6 pt-2 border border-neutral-400 rounded-sm p-4">
        <div className="w-80 h-80 -mb-2 mt-2 border border-neutral-400 rounded-sm overflow-hidden">
          <Start2Scene />
        </div>
        <div className="flex flex-col py-4 min-w-50 w-[45%]">
          <p>This is a keyhole case because:</p>
            <LessonList items={["The green-red edge is solved and the red-green-white corner is in the top layer, and", "The front right slot is unsolved" ]}/>
        </div>
      </div>
      <h1>How to use keyhole</h1>
      <p>{`In these cases, we already have one of the two pieces in the slot solved. Wouldn't it be great if you could just solve the last one directly? That's usually very simple, just a few moves:`}</p>
      <div className="flex flex-col gap-1 pb-4">
        <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
          <CubeScene
            facelets={CORNER_CASE_FACELETS}
            angles={{ x: 30, y: -30 }}
            hints
            lines={[
              { moves: ["L'", "U'", "L"], durations: [800, 800, 800], delay: 600, highlight: [...SOLVED, "BO", "WBO"] }
            ]}
            progress
          />
        </div>
      </div>
      <p>{`But it doesn't work. The orange-blue edge becomes unsolved.`}</p>
      <p>{`However, there's a way to preserve the solved piece. We'll use a`}<code>D</code>{` move, meaning`}<code>D</code>, <code>{`D'`}</code>, or <code>D2</code>. {`Depending on if we're solving the corner or edge, our approach will be a bit different.`}</p>
      <h2>The corner case</h2>
      <p aria-label="no, this wasn't written by AI">{`If we need to solve the corner, the edge is in the way—just like in the last example. Really, to solve the corner, it just needs to be between the orange and blue cross pieces. if we move the D layer, we can do that easily enough.`}</p>
      <p>{`Here, the front right slot is unsolved, so we can use it. We'll move the D layer in that direction, insert the corner piece, then undo the D move.`}</p>
      <div className="flex flex-col gap-1 pb-4">
        <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
          <CubeScene
            facelets={CORNER_CASE_FACELETS}
            angles={{ x: 30, y: -30 }}
            hints
            lines={[
              { moves: ["D", "R", "U'", "R'", "D'"], durations: [640, 640, 640, 640, 640], delay: 800, highlight: [...SOLVED, "BO", "WBO"] }
            ]}
            progress
          />
        </div>
      </div>
      <p>{`It's called keyhole because, well, it's like we're inserting a key into a hole.`}</p>
      <p>{`I oversimplified earlier. Opinions differ on when to use keyhole. Solving corner cases with keyhole is typically not much better than solving with pure `}<code>RU</code> or <code>LU</code>{` moves. It's up to you to figure out which you prefer in the long term, but keyhole is perfectly okay to start off.`}</p>
      <p>{`Additionally, if the cross color on the corner is facing up, using keyhole won't make the case much better. You'd probably be better off solving something else.`}</p>
      <h2>The edge case</h2>
      <p>{`Now let's say the corner is solved but the edge isn't. We need to move that corner out of the way, but doing so will put a different corner in the slot we're trying to solve the edge into. That's fine, as long as that corner doesn't come from a slot that is already solved.`}</p>
      <p>{`The back right slot is unsolved here. Let's use that corner. We'll do`}<code>{`D'`}</code>{` to move the corner into the slot we care about. We'll also do`}<code>{`U`}</code>{` at the same time to set up for inserting the edge. After that, the procedure is the same as before. We insert then undo the`}<code>{`D`}</code>{` move.`}</p>
      <div className="flex flex-col gap-1 pb-4">
        <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
          <CubeScene
            facelets={EDGE_CASE_FACELETS}
            hints
            lines={[
              { moves: [["U", "D'"], "R", "U'", "R'", "D"], durations: [600, 600, 600, 600, 600], delay: 900, highlight: [...SOLVED, "BR", "WBR", "BO", "WBO", "GO", "WGO"] }
            ]}
            progress
          />
        </div>
      </div>
      <h1>{`That's it`}</h1>
      <p>{`You now know keyhole! Not much to this one, really. But that doesn't mean it won't take some getting used to. Do untimed solves so that you can get used to spotting these cases.`}</p>
      <p>{`The slot you're trying to solve doesn't have to be in the front. That was just easier to show in a tutorial. You could solve cases where all the relevant pieces are in the back, if you can manage to spot them.`}</p>
      <p>{`Before you click play, try to spot the keyhole case.`}</p>
      <div className="flex flex-col gap-1 pb-4">
        <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
          <CubeScene
            facelets={HARD_CASE_FACELETS}
            hints
            lines={[
              { moves: [["U'", "D'"], "R", "U'", "R'", "D"], durations: [667, 667, 667, 667, 667], delay: 1000, highlight: [...SOLVED, "GO", "WGO"] }
            ]}
            progress
          />
        </div>
      </div>
      <p>{`Practice makes progress!`}</p>
    </LessonBody>
    </>
  )
}
