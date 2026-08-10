import LessonList from "../LessonList";
import LessonBody from "../LessonBody";
import S from "../LessonSpan";
import Story from "../LessonStory";
import LessonLink from "../LessonLink";
import TitleBar from "../TitleBar";


export default function EO() {
  return (
    <>
      <TitleBar title="Edge Orientation" subtitle="A hidden lens for good cubing" seconds={30} />
      <LessonBody>
        <Story storyParagraphs={[
          "There is danger. A young adventurer, Peaku, is trying to rescue his sister. In the heart of a labyrinth filled with monsters, he's found a clue to her whereabouts, and now he needs to escape before the whole place collapses.",
          "Peaku chances upon a speed potion. It's tightly sealed with a cork. With the labyrinth crawling with monsters, it's dangerous to slow down to open a bottle. A monster might find him and slow him down even more. But the sooner he uncorks the potion, the sooner he can use it to escape.",
          <strong key="story-question">So. When is the right time to drink the potion?</strong>
        ]} />
        <p>{"Cubers are in a similar predicament."}</p>
        <p>{"They can solve Edge Orientation (EO) right away and get a speed boost, but that stubborn step may cost them. They can delay and finish solving EO near the end, but then the solve is almost over already. Solving EO somewhere in the middle mixes the risks and benefits."}</p>
        <p>{"But, what is EO?"}</p>



        <h1>The good and the bad</h1>
        <p>{"With edge orientation, we can define every edge on the cube as good or bad. An edge is good if it can be completely solved with just"}<code>R</code>, <code>L</code>, <code>U</code>, and <code>D</code>{"moves. Click on the two examples below to see what that looks like."}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Good edge</span>
            <div className="w-80 h-80.5 border border-neutral-400 rounded-sm overflow-hidden">
              <iframe src="/learn/eo_1.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Bad edge</span>
            <div className="w-80 h-80.5 border border-neutral-400 rounded-sm overflow-hidden">
              <iframe src="/learn/eo_2.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
            </div>
          </div>
        </div>
        <p>
          <span>{`In the bad edge example, placing the edge in the correct location leaves it "flipped". The stickers on the edge do not line up with the centers. It's impossible to solve this kind of flipped edge with`}<code>R</code>, <code>L</code>, <code>U</code>, and <code>D</code>.{" "}</span>
          <LessonLink text="Check for yourself!" href="https://www.ao1k.com/recon/?scramble=R-_F_R_F-%0A%2F%2F_In_the_Solution_box_below,_try_to_use_only_R,_U,_L,_and_D_moves_and_solve_the_red%7E-green_edge.%0A%2F%2F_You-ll_find_it-s_impossible.&title=EO_Lesson_%7E-_Example_1" />
        </p>



        <h1>Why does this matter?</h1>
        <p>{"This ability to put every edge into one of two categories (good or bad) wouldn't be interesting, except that good edges are usually faster to solve."}</p>
        <p>
          {"We can use the ends of our fingers to do most"}<code>U</code> and <code>D</code>{"moves, and our wrists for "}<code>L</code> and <code>R</code>{`moves. It just so happens that we can use these four types of moves to solve any good edge. This is awesome since it means you can rapidly alternate between using your fingers and your wrists to solve good edges. Certain combinations of these moves are especially fast, like`}
          <code>{"R U R' U'"}</code>.
        </p>
        <p>{"We'll later explore how to deliberately use"}<code>F</code>and <code>y</code>{"moves to turn bad edges into good edges, making the entire solve faster."}</p>



        <h1>EO recognition</h1>
        <p>{"In the videos earlier, we had to attempt to solve the edge to check if it was good or not. It'd be a lot more useful if we didn't have turn the cube to check. Then there's no wasted moves. But to do this, we'd need to find some relationship between the colors of cube."}</p>
        <p>{`We'll focus on CFOP in this lesson, but these concepts will apply to any method.`}</p>

        <h2>Comparing colors</h2>
        {/* TODO: Add links for CFOP and F2L pages below, when they exist. */}
        <p>{``}</p>
        <p>{`The cube's centers don't move much in CFOP. What if we recognized EO by comparing the edges to the centers in some way? Which sticker on the edge would you look at? Consider this problem before you keep reading.`}</p>
        <p>{`Going back to the good edge video, the red-green edge "connects" to the red center by doing `}<code>U'</code>{`. In other words, the red stickers line up on both pieces. Then, we did`}<code>R'</code>{`to solve the edge.`}</p>

        <div className="flex flex-col gap-1 pb-4">
          <span className="text-sm font-bold">Good edge, again</span>
          <div className="w-80 h-80.5 border border-neutral-400 rounded-sm overflow-hidden">
            <iframe src="/learn/eo_1.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
          </div>
        </div>
        <p>{`If we were forced to use `}<code>F</code> or <code> B </code>{`to solve it, that'd automatically make it a bad edge. So the edge has to be able to connect to the right or left center using`} <code>R U L D</code> {` moves for it to be a good edge.`}</p>
        <p>{`Thankfully, since we only checking how pieces move with `} <code>R U L D</code>{`, there's only so many places that each sticker on one edge can be. The sticker is limited to certain "orbits". Let's look at how the sticker moves around. We'll color one sticker white and the other magenta. As you watch, remember that none of these moves change an edge's orientation.`}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Each location one-by-one</span>
            <div className="w-80 h-80.5 border border-neutral-400 rounded-sm overflow-hidden">
              <iframe src="/learn/eo_orbit_vid.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">All locations</span>
            <div className="w-80 h-80.5 border border-neutral-400 rounded-sm overflow-hidden">
              <iframe src="/learn/eo_orbit_img.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
            </div>
          </div>
        </div>
        <p>{`In CFOP, this is useful for OLL, but especially F2L, for reasons we'll look at later.`}</p>

        <h2>F2L and EO recognition</h2>
        <p>{`Using this new orbit knowledge, we can make some statements about F2L edges and recognizing EO:`}</p>
        <LessonList
          items={[
            "If a sticker in the **white** orbit matches the **L or R** center color, it's a good F2L edge.",
            "If a sticker in the **magenta** orbit matches the **F or B** center color, it's a good F2L edge."
          ]}
        />
        <p>{`With the magenta orbit, we're basically making the opposite statement compared to the white orbit. This makes sense, since if one sticker connects to the left or right center, the other must not.`}</p>
        <p>{"So which orbit do you use to recognize orientation? It's up to you. From the image above, you can see that the magenta orbit is more visible for top edges. For edges on the left or right sides, the white orbit is more visible."}</p>
        <p>{`If this is a bit confusing, don't worry. We'll go through some examples next. By the end of the lesson, you'll see several ways your new EO knowledge can help speed up your solves.`}</p>

        <h2>F2L EO examples</h2>
        <p>{"Find the red-green edge on the cube below. Is it good or bad?"}</p>
        <p>{"Let's use the magenta orbit. The sticker on this edge that is within the magenta orbit is green. Green matches the front center color. That's enough to tell you it's a good edge, as long as you know that you're looking at an F2L edge."}</p>
        <p>{"We can confirm it's good by solving it with"} <code>R U L D</code>{" moves. Click the play button below."}</p>
        <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Good or bad?</span>
            <div className="w-80 h-81.5 border border-neutral-400 rounded-sm overflow-hidden">
              <iframe src="/learn/eo_3.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">Orbit reference</span>
            <div className="w-80 h-81.5 border border-neutral-400 rounded-sm overflow-hidden">
              <iframe src="/learn/eo_orbit_img.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
            </div>
          </div>
        </div>
        
        <p>{"Below is one more example. Again, we're looking at the red-green edge. But the edge is in the middle layer, so try using the white orbit this time. Good or bad?"}</p>
        <p>{"The sticker on this edge that's within the white orbit is red. When we use this orbit, the sticker has to match the left or right center color. The red sticker doesn't match the right center that's next to it, but it does match the left. Another good edge. Let's verify:"}</p>
        <div className="w-80 h-81.5 mb-6 border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/eo_4.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
        <p>{"These approaches show how one sticker can be used to determine EO. But you still need to know the color of both stickers. Otherwise, you might be looking at an OLL edge or a cross piece."}</p>
        <p>{"If a both stickers aren't visible, you can either try to remember what it was from past moves (lookahead, an advanced skill), deduce what the sticker is, or barring those options, tilt the cube to check directly. You should avoid rotating or doing moves to get information, since that is wasted effort and would slow you down."}</p>

        <h2>OLL edges</h2>
        <p>{"If you know OLL, you already know how to orient last layer edges. You solve the top cross, which flips all the edges so that all of the same color is on top."}</p>
        <p>{"But it's useful to know that an OLL edge in the middle layer can still considered be oriented or not. Sometimes you'll try to influence OLL during F2L in various ways."}</p>
        <p>{`A correctly oriented OLL edge will always have the top center color in the white orbit. Knowing that, is the white-green edge good or bad? Try to remember the orbit diagram and how it was made rather than referring back to it.`}</p>
        <div className="w-80 h-80 mb-2  border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/eo_5.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
        <input type="checkbox" id="eo5-answer" className="hidden peer/eo5" />
        <label htmlFor="eo5-answer" className="inline-block peer-checked/eo5:hidden cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
          Click to reveal the answer
        </label>
        <label htmlFor="eo5-answer" className="hidden peer-checked/eo5:inline-block cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mb-1 w-fit">
          Click to hide the answer
        </label>
        <div className="opacity-0 peer-checked/eo5:opacity-100 transition-opacity duration-500 text-neutral-400 mb-4">
          {`It's a bad edge. The sticker in the white orbit is green, and green doesn't match the top center color. You can verify by doing`} <code>R</code>{`, which puts the wrong color on top.`}
        </div>
        <span className="mb-6">
          Influencing OLL edges during F2L can be done in an unstructured way or in algorithm sets like{' '}
          <a 
            href="https://www.speedsolving.com/wiki/index.php/ZBLS"
            target="_blank"
            rel="noopener noreferrer"
          >
              ZBLS
          </a>
          .
        </span>

        <h2>Aside: the ZZ method</h2>
        <p>{"EO is useful for CFOP, but it is an integral part of the ZZ method. It also provides great intuition for how EO really works."}</p>
        <span>
          You can find an excellent{' '}
          <a 
            href="https://www.zzmethod.com/tutorial/eo"
            target="_blank"
            rel="noopener noreferrer" 
          >
              introduction to EO and ZZ
          </a>
          {' '}here by crystalcuber. His guide inspired parts of this one.
        </span>



        <h1>Changing EO</h1>
        <p>{"So far, we've only shown how to use "}<code>R</code>, <code>L</code>, <code>U</code>, and <code>D</code>{" moves to solve good edges. But if an edge is bad, what do you do?"}</p>
        
        <h2>Changing F2L EO</h2>
        <p>{"Doing y rotations is the most typical way to deal with bad edges. If the F2L edge is in the top layer, rotating flips F2L edge orientation. Good F2L edges turn into bad edges, and bad become good."}</p>
        <p>{"Below, we show the same cube with different rotations applied. Only the good F2L edges are highlighted."}</p>
        <div className="flex flex-row flex-wrap pb-6 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">No rotation</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <iframe src="/learn/eo_6_y0.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold">y rotation</span>
            <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
              <iframe src="/learn/eo_6_y1.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
            </div>
          </div>
        </div>
        <p>{"Notice how the red-green edge is highlighted in both images, and how the orange-green edge between the red and blue centers is highlighted in neither. If you apply the EO recognition rules from earlier, you'll see that rotating only flips EO of the top and bottom layer edges! The middle F2L edges are unaffected."}</p>
        <p>{"Due to this difficulty with altering their EO, bad F2L edges in the middle layer are some of the worst cases you can get. Often, you'll want to solve something else and destroy this case in the process."}</p>
        <p>{"If you do have to solve them, you either use F moves, or you can take the edge out of the middle layer before you rotate and then solve it. Which of these you choose can depend on the case, the pairs after it, and your own preferences."}</p>



        <h1>The hidden magic of EO</h1>
        <Story storyParagraphs={[
          <>
            {"Peaku runs through the labyrinth's "}
            <strong>hedges</strong>
            {" and comes toe-to-toe with an orc. They fight, and Peaku defeats it unharmed. He decides it's as good a time as any to drink that potion."}
          </>,
          "Peaku opens his bag to shattered glass and the last drips of the potion. He curses his luck.",
          "A shard of the glass glimmers in the torchlight. Peaku picks it out and holds it in front of his eye. The world appears to open up. The glass has some property that makes the hedges look almost invisible! He has no more need to rush. He heads for the exit, navigating without any more wrong turns or guesses.",
        ]} />

        <h2>Improving efficiency</h2>
        <p>
          {"Recognizing the orientation of the edge gives information on how to solve that edge. This might not help you solve the cube faster, but it can make you more "}
          <strong>efficient</strong>
          {". A good edge will "}
          <strong>never</strong>
          {" require you to:"}
        </p>
        <LessonList style='alpha' items={[
          "Rotate the entire cube",
        ]} />
        <div className="-mt-4 pl-5.5">
          <S span="OR" />
        </div>
        <div>
          <LessonList style='alpha' items={[
            "Use slower F or B moves",
          ]} />
        </div>
        <p>{"If your solution to a pair with a good edge doesn't use only "}<code>RULD</code>{" moves, you typically would have made a mistake."}</p>
        <p>{"From there, you can experiment to try to find a better solution, or look up an alg or tutorial."}</p>
        <p>{"EO is one of only a few tools you can use to help tell if you are being efficient. It may give you many things to fix. Fixing them will slow you down at first, but as you get familiar with the solutions, you will eventually get faster as well."}</p>

        <h2>Improving pair choice</h2>
        <p>{"Pairs with good edges are typically faster to solve than bad-edge pairs, so when there's multiple pairs to solve, it's nice to solve good-edge pairs first."}</p>
        <p>{"Doing x, y, and z rotations in a solve is essentially time spent doing nothing. In a perfect world, only one y rotation would be needed in a solve. You can solve cross and all good-edge pairs, rotate to turn all the bad edges into good edges, and finally solve the remaining pairs. And indeed, EO is a powerful tool for you to see how to reduce unnecessary rotations and F moves."}</p>
        <p>{"But reality is more complicated. What if a very fast pair would require a rotation before all good-edge pairs are solved? What if you have multiple bad edges in the middle layer? The choice is yours."}</p>

        <p>{"Here's a hard example. Which pair is better to solve here, orange-blue or orange-green?"}</p>
        <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
          <iframe src="/learn/eo_7.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
        </div>
        <input type="checkbox" id="eo7-answer" className="hidden peer/eo7" />
        <label htmlFor="eo7-answer" className="inline-block peer-checked/eo7:hidden cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mt-4 mb-1 w-fit">
          Click to reveal the answer
        </label>
        <label htmlFor="eo7-answer" className="hidden peer-checked/eo7:inline-block cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mt-4 mb-1 w-fit">
          Click to hide the answer
        </label>
        <div className="opacity-0 peer-checked/eo7:opacity-100 transition-opacity duration-500 text-neutral-400 mt-1 mb-4">
          Orange-blue is best. Orange-green is good, but it would require a rotation. Orange-blue is a good-edge pair, but solving it may destroy the free pair if you are not careful. However, you can indeed solve orange-blue reasonably without destroying orange-green. <LessonLink text="Check it out!" href="https://www.ao1k.com/recon/?solution=D_R-_U-_R_D-%0AU2_F_U-_F-_%2F%2F_chose_not_to_rotate_because_blue%7E-red_pair_has_a_good_edge%0AU_R-_U_R_U-_R-_U_R%0Ay_U2_R_U2-_R2-_U-_R2_U-_R-%0A%2F%2F_last_layer_not_shown&scramble=D_L2_D2_F_L_B_L2_F_D_L_U-_F2_D_U2_L2_D2_L2_F2_L2_D_R2_B2_x2_y-" />
        </div>

        <h2>Simplifying your memory</h2>
        <p>{`Once you've recognized an edge as good or bad, it's possible to keep that knowledge in your brain. At times, this can be easier than remembering both colors on the edge.`}</p>
        <p>{`Say in the last example you decide to solve the orange-blue pair first. You see orange-green is a bad edge. Since you'll use `}<code>RULD</code>{` moves to solve orange-blue, you know, whatever happens to orange-green, it'll still be a bad edge. So you might choose to rotate immediately after you solve orange-blue even if you don't know exactly what case it is.`}</p>
        <p>{`This example is a bit too simple, since you'll be able to keep track of orange-green in other ways just as easily. A more realistic example might be remembering the orientation of the red-green edge as you solve these two other pairs.`}</p>
        <p>{`Additionally, keeping track of whether an edge is good or bad might make it easier to recognize the case. After all, you no longer need to look very closely at it.`}</p>
        <p>{`This is all pretty hard to do, because it means remembering details about an edge while you solve something else.`}</p>
      </LessonBody>
    </>
  );
}