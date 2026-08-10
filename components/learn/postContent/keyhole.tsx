import LessonList from "../LessonList";
import LessonBody from "../LessonBody";
import S from "../LessonSpan";
import Story from "../LessonStory";
import LessonLink from "../LessonLink";
import TitleBar from "../TitleBar";


export default function Keyhole() {
  return (
    <>
    <TitleBar title="Keyhole" subtitle=""></TitleBar>
    <LessonBody>
      <p>{`Keyhole is a technique. It lets you solve certain F2L cases quickly and without much risk.`}</p>
      <p>{`Sometimes, a quick example or two is enough to understand a concept. Here's a couple solutions that use keyhole:`}</p>
      <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
        <div className="w-80 h-80 mb-2  border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/keyhole/start_1.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
        <div className="w-80 h-80 mb-2  border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/keyhole/start_2.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
      </div>
      <p>{`Don't quite get it? Don't worry, we'll go over everything. Even if this does make sense, you might benefit from reading on. There's a lot more ways to use keyhole than just these two examples.`}</p>
      <Story storyParagraphs={[`There is a long road. Peaku has been walking all day in a light rain. He has just left the familiar behind. The path is rough and muddy, and that is to say nothing of the bugs.`, `The path turns steep. He slips through rocks and mud. He is in pain, and although he can stand easily, he does not.`, `A green bird lands on his mud-covered chest. A jewel in the rough. It screams out a mocking laugh.`,`What do you want, bird, Peaku says.`,`Watch you suffer! the bird says.`,`"What?"`,`The bird mocks him and flies off a short ways. It looks back at Peaku. Peaku stands and follows, weary of traps or evil creatures.`, `No such dangers appear. The bird perches on a dry log under a small rocky overhang. It hops, flutters the wet off its wings. Snack! it squawks.`, `Peaku drops his pack and sits down heavily. He offers the bird some nuts from his palm. It is a messy eater and finishes them off quickly.`,`Progress! Progress! it says.`, `Progress, Peaku agrees. 🦜`]}/>
      <p>{`Often, it can be hard to know when you're solving an F2L pair perfectly. When you get to use keyhole, you'll pretty much know you're making progress. Any other way you could solve it will almost always be worse.`}</p>
      <h1>When to use keyhole</h1>
      <p>{`You can use keyhole whenever these three things are all true:`}</p>
      <LessonList items={["There is an F2L pair where one piece is solved and the other piece is in the top layer, and", "There is another slot that isn't solved"]}/>
      <p>{`A "slot" is the location where a corner and edge piece need to get solved in the first and second layer. There's usually four unsolved slots after you solve cross.`}</p>
      <p>{`Let's look at those keyhole examples again.`}</p>
      <div className="flex flex-row flex-wrap gap-8 pb-6 mb-6 pt-2 border border-neutral-400 rounded-sm p-4">
        <div className="w-80 h-80 -mb-2 mt-2 border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/keyhole/start_1.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
        <div className="flex flex-col py-4 min-w-50 w-[45%]">
          <p>This is a keyhole case because:</p>
            <LessonList items={["The green-orange-white corner is solved and the green-orange edge is in the top layer, and", "The front right slot is unsolved" ]}/>
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-8 pb-6 mb-6 pt-2 border border-neutral-400 rounded-sm p-4">
        <div className="w-80 h-80 -mb-2 mt-2 border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/keyhole/start_2.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
        <div className="flex flex-col py-4 min-w-50 w-[45%]">
          <p>This is a keyhole case because:</p>
            <LessonList items={["The green-red edge is solved and the red-green-white corner is in the top layer, and", "The front right slot is unsolved" ]}/>
        </div>
      </div>
      <h1>How to use keyhole</h1>
      <p>{`In these cases, we already have one of the two pieces in the slot solved. Wouldn't it be great if you could just solve the last one directly? That's usually very simple, just a few moves:`}</p>
      <div className="flex flex-col gap-1 pb-4">
        <div className="w-80 h-80.5 border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/keyhole/naive.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
      </div>
      <p>{`But it doesn't work. The orange-blue edge becomes unsolved.`}</p>
      <p>{`However, there's a way to preserve the solved piece. We'll use a`}<code>D</code>{` move, meaning`}<code>D</code>, <code>{`D'`}</code>, or <code>D2</code>. {`Depending on if we're solving the corner or edge, our approach will be a bit different.`}</p>
      <h2>The corner case</h2>
      <p aria-label="no, this wasn't written by AI">{`If we need to solve the corner, the edge is in the way—just like in the last example. Really, to solve the corner, it just needs to be between the orange and blue cross pieces. if we move the D layer, we can do that easily enough.`}</p>
      <p>{`Here, the front right slot is unsolved, so we can use it. We'll move the D layer in that direction, insert the corner piece, then undo the D move.`}</p>
      <div className="flex flex-col gap-1 pb-4">
        <div className="w-80 h-80.5 border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/keyhole/corner.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
      </div>
      <p>{`It's called keyhole because, well, it's like we're inserting a key into a hole. Imagine that.`}</p>
      <p>{`One exception to be aware of. If the corner has the cross color facing up, keyhole doesn't really make the pair that much more efficient. You'd probably be better off solving something else.`}</p>
      <h2>The edge case</h2>
      <p>{`Now we'll say the corner is the piece that's in the way. We need to move that corner out of the way, but this will put a different corner in the slot we're trying to solve the edge into. As long as we don't care about that corner, we're fine.`}</p>
      <p>{`The back right slot is unsolved here. Let's use that. We'll do`}<code>{`D'`}</code>{` to move its corner into the slot we care about. We'll also do`}<code>{`U`}</code>{` at the same time to set up for inserting the edge.`}</p>
      <div className="flex flex-col gap-1 pb-4">
        <div className="w-80 h-80.5 border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/keyhole/edge.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
      </div>
      <h1>{`That's it`}</h1>
      <p>{`You now know keyhole! Not much to this one, really. But that doesn't mean it won't take some getting used to. Do untimed solves so that you can get used to spotting these cases.`}</p>
      <p>{`The slot you're trying to solve doesn't have to be in the front. That was just easier to show in a tutorial. You could solve cases where all the relevant pieces are in the back, if you can manage to spot them.`}</p>
      <div className="flex flex-col gap-1 pb-4">
        <div className="w-80 h-80.5 border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/keyhole/hard.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
      </div>
      <p>{`Practice makes progress!`}</p>
    </LessonBody>
    </>
  )
}