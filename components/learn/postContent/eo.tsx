import LessonList from "../LessonList";
import LessonParagraph from "../LessonParagraph";
import LessonSpan from "../LessonSpan";
import LessonStory from "../LessonStory";
import LessonHeader from "../LessonHeader";
import LessonSubheader from "../LessonSubheader";
import LessonLink from "../LessonLink";
import TitleBar from "../TitleBar";


export default function EO() {
  return (
    <>
      <TitleBar title="Edge Orientation" subtitle="A hidden lens for good cubing" seconds={30} />
      <LessonStory storyParagraphs={[
        "A young adventurer, Peaku, is trying to rescue their sister. He's found a clue to her whereabouts in the heart of a labyrinth, and now they need to escape before the whole place collapses.",
        "Peaku chances upon a speed potion. It's tightly sealed with a cork. With the labyrinth crawling with monsters, it's dangerous to slow down to open a bottle. A monster might find him and slow him down even more. But the sooner he uncorks the potion, the sooner he can use it to escape.",
        "**So. When is the right time to drink the potion?**"
      ]} />

      <LessonParagraph paragraph={"Cubers are in a similar predicament."} />
      <LessonParagraph paragraph={"They can solve Edge Orientation (EO) right away and get a speed boost, but that stubborn step may cost them. You can delay and finish solving EO near the end, but then the solve is almost over already. Solving EO somewhere in the middle mixes the risks and benefits."} />
      <LessonParagraph paragraph={"But, what is EO?"} />
      <LessonHeader header="Good and bad edges" />

      <LessonParagraph paragraph={`With edge orientation, we can define every edge on the cube as good or bad. An edge is good if it can be completely solved with just R, L, U, and D moves. Click on the two examples below to see what that looks like.`} />

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
        <LessonSpan span={`In the bad edge example, placing the edge in the correct location leaves it "flipped". The stickers on the edge do not line up with the centers. It's impossible to solve this kind of flipped edge with R, U, L, and D. `} />
        <LessonLink text="Check for yourself!" href="https://www.ao1k.com/recon/?scramble=R-_F_R_F-%0A%2F%2F_In_the_Solution_box_below,_try_to_use_only_R,_U,_L,_and_D_moves_and_solve_the_red%7E-green_edge.%0A%2F%2F_You-ll_find_it-s_impossible.&title=EO_Lesson_%7E-_Example_1" />
      </p>

      <LessonHeader header="Why does this matter?" />

      <LessonParagraph paragraph="Simply put, ergonomics." />
      <LessonParagraph paragraph={`Cubers can use the ends of their fingers to do most U and D moves. They'll use their wrists to do L and R moves. We'll call these four types of moves **natural** moves. Coincidentally, you can use natural moves to solve any good edge. Good edges are indeed quite good to solve since you can rapidly alternate between using your fingers and your wrists. `}/>
      <LessonParagraph paragraph="We'll later explore how to use F and y moves to turn bad edges into good edges, making the entire solve faster." />

      <LessonHeader header="EO recognition" />

      <LessonParagraph paragraph="We'll need strategies to recognize whether an edge is good or bad. The complexity of EO recognition changes depending on what method you use to solve the cube." />
      <LessonSubheader header="CFOP and EO" />

      {/* TODO: Add links for CFOP and F2L pages below, when they exist. */}
      <LessonParagraph paragraph={`The most common use case of EO in CFOP is for **F2L** edges.`} />
      <LessonParagraph paragraph={`If the F2L edge in the top layer, it's easy to distinguish good and bad. Do the following:`}/>
      <LessonList items={[
        "**Find the edge.** Find an F2L edge in the top layer.",
        "**Find the top sticker.** Look at what sticker is on the top side of that edge.",
        "**Compare to centers.** Compare that sticker to the front and back center pieces. If it is one of those two center colors, it's a good edge."
      ]} />
      <LessonParagraph paragraph={`Find the red-green edge on the cube below. We'll follow this same process. The top sticker on that edge is green. The front center is also green. It's a good edge!`} />
      <LessonParagraph paragraph="We can confirm it's a good edge by solving it with natural moves. Click the play button below." />
      <div className="w-80 h-81.5 border border-neutral-400 mb-4 rounded-sm overflow-hidden">
        <iframe src="/learn/eo_3.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
      </div>

      <LessonParagraph paragraph={`Then, what if the edge is in the middle layer? The process is just slightly different.`} />
      <LessonList items={[
        "**Find the edge.** Find an F2L edge in the middle layer.",
        "**Find the side sticker.** On that edge, look at what sticker is next to the left or right center.",
        "**Compare to centers.** If that sticker is the same color as the left or right center, it's a good edge."
      ]} />
      <LessonParagraph paragraph={`Below is one more example. Again, we're looking at the red-green edge. The side sticker on this edge is the one that is next to the right center. This means the side sticker on the edge is red. The red sticker doesn't match the right center it is next to, but it does match the left. Another good edge. Let's verify:`} />
      <div className="w-80 h-81.5 mb-6 border border-neutral-400 rounded-sm overflow-hidden">
        <iframe src="/learn/eo_4.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
      </div>
      <LessonParagraph paragraph={`These approaches show how one sticker can be used to determine EO. But you still need to know the color of both stickers. Otherwise, you can't be sure whether you are looking at an F2L edge or not.`} />
      <LessonParagraph paragraph={`If an important sticker isn't visible, you can either try to remember what it was from past moves (lookahead, an advanced skill), deduce what the sticker is, or barring those options, tilt the cube to check directly. As always, you should avoid rotating or doing extra moves to find more information.`} />
      <LessonSubheader header="OLL edges" />
      <LessonParagraph paragraph={`If you know OLL, you already know how to orient last layer edges. But it's useful to know that an OLL edge in the middle layer can still considered be oriented or not. If a natural move would put the same color as the upper center sticker on top, it's a good edge.`}/>
      <LessonParagraph paragraph="Is the white-green edge good or bad?" />
      <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
        <iframe src="/learn/eo_5.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
      </div>
      <input type="checkbox" id="eo5-answer" className="hidden peer/eo5" />
      <label htmlFor="eo5-answer" className="peer-checked/eo5:hidden cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mt-4 mb-1 w-fit">
        Click to reveal the answer
      </label>
      <label htmlFor="eo5-answer" className="hidden peer-checked/eo5:inline-block cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mt-4 mb-1 w-fit">
        Click to hide the answer
      </label>
      <div className="opacity-0 peer-checked/eo5:opacity-100 transition-opacity duration-500 text-neutral-400 mt-1 mb-4">
        It&apos;s a bad edge. A natural R move would put the green sticker on top. Green doesn't match the white U center.
      </div>
      <span className="mb-6">
        This knowledge can be useful if you&apos;re trying to influence the orientation of last layer edges while you solve F2L. Influencing OLL edges can be done in an unstructured way or in algorithm sets like{' '}
        <a 
          href="https://www.speedsolving.com/wiki/index.php/ZBLS"
          target="_blank"
          rel="noopener noreferrer" 
          className="primary-100 underline underline-offset-2">
            ZBLS
        </a>
        .
      </span>


      <LessonSubheader header="Aside: The ZZ method" />
      <LessonParagraph paragraph={`EO is useful for CFOP, but it is an integral part of the ZZ method. It also provides great intuition for what EO really means.`} />
      <span>
        You can find an excellent{' '}
        <a 
          href="https://www.zzmethod.com/tutorial/eo"
          target="_blank"
          rel="noopener noreferrer" 
          className="primary-100 underline underline-offset-2">
            introduction to EO and ZZ
        </a>
        {' '}here by crystalcuber.
      </span>
      <LessonHeader header="Changing EO" />
      <LessonParagraph paragraph={`So far, we've only shown how to use natural moves to solve good edges. But if an edge is bad, what do you do?`} />
      <LessonSubheader header="Changing F2L EO" />
      <LessonParagraph paragraph={`Doing y rotations is the most typical way to deal with bad edges. If the F2L edge is in the top layer, rotating flips F2L edge orientation. Good F2L edges turn into bad edges, and bad become good.`} />
      <LessonParagraph paragraph={`Below, we show the same cube with different rotations applied. Only the good F2L edges are highlighted.`} />

      <div className="flex flex-row pb-6 gap-4">
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
      <LessonParagraph paragraph={`Notice how the red-green edge is highlighted in both images, and how the orange-green edge between the red and blue centers is highlighted in neither. If you apply the EO recognition rules from earlier, you'll see that rotating only flips EO of the top and bottom layer edges! The middle F2L edges are unaffected.`}/>
      <LessonParagraph paragraph={`Due to this difficulty with altering their EO, bad F2L edges in the middle layer are some of the worst cases you can get. Often, you'll want to solve something else and destroy this case in the process.`} />
      
      <LessonParagraph paragraph={`If you do have to solve them, you must either use F moves, or take the edge out of the middle layer before you rotate and then solve it. Which of these you choose can depend on the case, the pairs after it, and your own preferences.`} />

      <LessonHeader header="The Hidden Magic of EO" />

      <LessonStory storyParagraphs={[
        "Peaku runs through the labyrinth's **hedges** and comes toe-to-toe with an orc. They fight, but Peaku defeats it unharmed. He decides it's as good a time as any to drink that potion.",

        "Peaku opens his bag to shattered glass and the last drips of the potion. He curses his luck.",
        
        "A shard of the glass glimmers in the torchlight. Peaku picks it out and holds it in front of his eye. The world appears to open up. The glass has some property that makes the hedges look almost invisible! He has no more need to rush. He heads for the exit, navigating without any more wrong turns or guesses.",
      ]} />

      <LessonSubheader header="Improving Efficiency" />

      <LessonParagraph paragraph="Recognizing the orientation of the edge gives information on how to solve that edge. This might not help you solve the cube faster, but it can make you more **efficient**. A good edge will **never** require you to:" />

      <LessonList style='alpha' items={[
        "Rotate the entire cube in order to solve it",
      ]} />
      <div className="pl-5.5">
        <LessonSpan span="OR" />
      </div>
      <div className="pb-4">
        <LessonList style='alpha' items={[
          "Use slower F or B moves",
        ]} />
      </div>

      <LessonParagraph paragraph="If your solution to a pair with a good edge doesn't use only natural moves, you typically would have made a mistake." />
      <LessonParagraph paragraph={`From there, you can experiment to try to find a natural-move solution, or look up an alg or tutorial.`} />
      <LessonParagraph paragraph={`EO is one of only a few tools you can use to help tell if you are being efficient. It may give you many things to fix. Fixing them will slow you down at first, but as you get familiar with the solutions, you will eventually get faster as well.`} />

      <LessonSubheader header="Improving Pair Choice" />
      <LessonParagraph paragraph={`Pairs with good edges are typically faster to solve than bad edge pairs, so when there's multiple pairs to solve, it's nice to solve good-edge pairs first.`} />
      <LessonParagraph paragraph={`Doing x, y, and z rotations in a solve is essentially time spent doing nothing. In a perfect world only one y rotation would be needed in a solve. You can solve cross and all good edge pairs, rotate to turn all the bad edges into good edges, and finally solve the remaining pairs. And indeed, EO is a powerful tool for you to see how to reduce unnecessary rotations and F moves.`} />
      <LessonParagraph paragraph={`But reality is more complicated. What if a very fast pair would require a rotation before all good edge pairs are solved? What if you have multiple bad edges in the middle layer? The choice is yours.`} />

      <LessonParagraph paragraph={`Here's a hard example. Which pair is better to solve here, orange-blue or orange-green?`} />
      <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
        <iframe src="/learn/eo_7.html" className="w-165 h-165 overflow-hidden scale-50 origin-top-left" />
      </div>
      <input type="checkbox" id="eo7-answer" className="hidden peer/eo7" />
      <label htmlFor="eo7-answer" className="peer-checked/eo7:hidden cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mt-4 mb-1 w-fit">
        Click to reveal the answer
      </label>
      <label htmlFor="eo7-answer" className="hidden peer-checked/eo7:inline-block cursor-pointer text-md text-neutral-400 select-none hover:text-neutral-300 transition-colors bg-neutral-800 px-3 py-1 rounded-sm mt-4 mb-1 w-fit">
        Click to hide the answer
      </label>
      <div className="opacity-0 peer-checked/eo7:opacity-100 transition-opacity duration-500 text-neutral-400 mt-1 mb-4">
        Orange-blue is best. Orange-green is good, but it would require a rotation. Orange-blue is a good-edge pair, but solving it may destroy the free pair if you are not careful. However, you can indeed solve orange-blue reasonably without destroying orange-green. <LessonLink text="Check it out!" href="https://www.ao1k.com/recon/?solution=D_R-_U-_R_D-%0AU2_F_U-_F-_%2F%2F_chose_not_to_rotate_because_blue%7E-red_pair_has_a_good_edge%0AU_R-_U_R_U-_R-_U_R%0Ay_U2_R_U2-_R2-_U-_R2_U-_R-%0A%2F%2F_last_layer_not_shown&scramble=D_L2_D2_F_L_B_L2_F_D_L_U-_F2_D_U2_L2_D2_L2_F2_L2_D_R2_B2_x2_y-" />
      </div>
    </>
  );
}