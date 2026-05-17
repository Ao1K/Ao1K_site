import InvertIcon from '../icons/invert';
import ShareIcon from '../icons/share';
import CopyIcon from '../icons/copy';
import CameraIcon from '../icons/image';
import TakePictureIcon from '../icons/camera';
import TextTIcon from '../icons/text-T';
import PlayIcon from '../icons/play';
import QuestionIcon from '../icons/info';
import DropdownIcon from '../icons/dropdown';
import Image from 'next/image';
import InfoPanelSection from './InfoPanelSection';

const dummyButtons = [
  { label: 'M', title: 'Mirror M' },
  { label: 'S', title: 'Mirror S' },
  { label: 'X', title: 'Rotate X' },
  { label: 'Y', title: 'Rotate Y' },
  { label: 'Z', title: 'Rotate Z' },
];

export function InfoPanelIntro() {
  return (
    <>
      <p className="text-lg">
        The plan is simple:
      </p>
      <ol className="list-decimal list-inside pl-2">
        <li>Write down your cube solves</li>
        <li>See what you could have done better</li>
        <li>Create images, gifs, and embeddings</li>
        <li>Take over the world 🦜</li>
      </ol>
    </>
  );
}

export default function InfoPanelContent() {
  return (
    <div className="p-4 space-y-4 text-sm leading-relaxed">
      <InfoPanelIntro />
      <div className="flex flex-row gap-4 items-start">
        <Image
          src="/recon/reconSplash.png"
          alt="Reconstruct tool splash"
          width={279}
          height={247}
          loading="lazy"
          className="min-w-0 w-1/2 object-contain"
        />
        <Image
          src="/recon/reconSplash.gif"
          alt="Example cube solve reconstruction"
          width={320}
          height={320}
          unoptimized
          loading="lazy"
          className="min-w-0 w-1/2 -m-6 object-contain"
        />
      </div>

      <InfoPanelSection title="The basics">
        <p>
          If you or someone else does a cube solve, you can use this tool to write it down.
        </p>
        <p>
          You&apos;ll need to know <a className="underline underline-offset-2" href="https://jperm.net/3x3/moves" target="_blank">cubing notation</a>. 
          Then you can start writing:
        </p>
        <ol className="list-decimal list-inside pl-2 space-y-4 marker:text-dark_accent marker:text-lg marker:space-x-2">
          <li>
            In the Scramble box, copy in a scramble from somewhere like <a className="underline underline-offset-2" href="https://cstimer.net" target="_blank">cstimer</a>.
          </li>
          <li>
            In the Solution box, write the first step of your solution. An icon will appear! No more writing comments.
          </li>
          <Image
            src="/recon/iconExample.png"
            alt="Example suggestions"
            width={403}
            height={358}
            loading="lazy"
            className="w-fit object-contain"
          />
          <li>
            Finish writing the solve.
          </li>
          <li>
            Add the solve time. Beside it, you&apos;ll see &quot;stm&quot; and &quot;tps&quot;. What do they mean?
          </li>
          <div className="flex flex-row flex-wrap text-nowrap items-center gap-y-2 ml-3.5 pt-2 pb-2">
            <div className="border border-neutral-600 flex flex-row items-center justify-start">
              <div className="pt-2 pb-2 px-2 text-xl text-primary-100 bg-primary-900 rounded-sm w-17">32.1</div>
              <div className="text-primary-100 pr-2 text-xl">sec</div>
            </div>
            <div className="text-primary-100 ml-2 text-xl">65 stm </div>
            <div className="text-primary-100 mx-2 text-xl">(2.02 tps)</div>
          </div>
          <p className="text-sm ml-4 mt-2">
            <strong>STM</strong> means Slice Turn Metric. It&apos;s a way of measuring the number of moves in your solution. <strong> x y </strong> and <strong>z </strong> don&apos;t count as moves. Every other letter counts as one move.
          </p>
          <p className="text-sm ml-4 mt-2">
            <strong>TPS</strong> means Turns Per Second. Here, turns are measured in STM.
          </p>
        </ol>
      </InfoPanelSection>

      <InfoPanelSection title="Recon ergonomics!">
        <h3 className="py-1 text-lg mt-3 mb-2 pl-2 w-1/2 text-dark bg-primary-200">{`>>`} Text substitutions</h3>
        <p>
          To make typing easier, there&apos;s some automatic text subsitutions that are built in to the text editors.
        </p>
        <p>
          For example, typing two valid moves back-to-back like &quot;RR&quot; will automatically change to &quot;R2&quot;. 
          Here&apos;s a full list of examples:
        </p>
        <table className="border-collapse border border-primary-300 w-fit text-sm">
          <thead>
            <tr className="bg-primary-700">
              <th className="border border-primary-300 p-2 text-left">Typing:</th>
              <th className="border border-primary-300 p-2 text-left">Becomes:</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-primary-850">
              <td className="border border-primary-300 p-2">&quot;RR&quot;</td>
              <td className="border border-primary-300 p-2">&quot;R2&quot;</td>
            </tr>                    
            <tr>
              <td className="border border-primary-300 p-2">&quot;UD&quot; + space</td>
              <td className="border border-primary-300 p-2">&quot;(U D) &quot;</td>
            </tr>
            <tr className="bg-primary-850">
              <td className="border border-primary-300 p-2">&quot;RF&quot;</td>
              <td className="border border-primary-300 p-2">&quot;R F&quot;</td>
            </tr>
            <tr>
              <td className="border border-primary-300 p-2">&quot;Uw&quot;</td>
              <td className="border border-primary-300 p-2">&quot;u&quot;</td>
            </tr>
            <tr>
              <td className="border border-primary-300 p-2">&quot;X&quot; / &quot;Y&quot; / &quot;Z&quot;</td>
              <td className="border border-primary-300 p-2">&quot;x&quot; / &quot;y&quot; / &quot;z&quot;</td>
            </tr>
          </tbody>
        </table>
        <h3 className="py-1 text-lg mt-12 mb-2 pl-2 w-1/2 text-dark bg-primary-200">{`>>`} Tools</h3>
        <div className="flex flex-row gap-1 flex-wrap mb-6 ml-2 mt-6">
          {dummyButtons.map(({ label, title }) => (
            <div key={label} className="relative inline-block group">
              <div className="flex justify-center items-center w-10 h-8 px-2 py-1 rounded-sm border border-neutral-600 text-primary-100 select-none">
                {label}
              </div>
              <div className="flex flex-col absolute left-1/2 -translate-x-1/2 items-center whitespace-nowrap text-primary-100 bg-primary-900 rounded-md text-sm opacity-0 group-hover:opacity-100 pointer-events-none select-none z-10">
                <div>{title}</div>
              </div>
            </div>
          ))}
          <div className="relative inline-block group">
            <div className="flex justify-center items-center w-10 h-8 px-2 py-1 rounded-sm border border-neutral-600 text-primary-100 select-none">
              <InvertIcon />
            </div>
            <div className="flex flex-col absolute left-1/2 -translate-x-1/2 items-center whitespace-nowrap text-primary-100 bg-primary-900 rounded-md text-sm opacity-0 group-hover:opacity-100 pointer-events-none select-none z-10">
              <div>Invert</div>
            </div>
          </div>
          <div className="relative inline-block group">
            <div className="flex justify-center items-center w-10 h-8 px-2 py-1 rounded-sm border border-neutral-600 text-primary-100 select-none text-xs">
              {'// '}
            </div>
            <div className="flex flex-col absolute left-1/2 -translate-x-1/2 items-center whitespace-nowrap text-primary-100 bg-primary-900 rounded-md text-sm opacity-0 group-hover:opacity-100 pointer-events-none select-none z-10">
              <div>Remove Comments</div>
            </div>
          </div>
        </div>
        <p>
          These buttons let you modify moves. Select line(s) of text, then click a button to modify. 
          If you don&apos;t select a line, 
          the button will modify all of the last textbox you had selected.
        </p>
        <h3 className="py-1 text-lg mt-12 mb-2 pl-2 w-1/2 text-dark bg-primary-200">{`>>`} Settings menu</h3>
        <p>
          The settings menu is at the top right of the page. You can adjust 
          {' '}{
            ['c','u','b','e',' ','c','o','l','o','r','s'].map((char, i) => (
              <span
                key={i}
                style={{ color: ['#EEFF00','#FFA914','#FF0000','#3EF600','#2870FF'][(i * 7) % 6] }}
              >{char}</span>
            ))
          }{' '}, enable adding splits, and more.
        </p>
      </InfoPanelSection>

      <InfoPanelSection title="Creating something beautiful">
        <h3 className="py-1 text-lg mt-3 mb-2 pl-2 w-1/2 text-dark bg-primary-200">{`>>`} Sharing solves</h3>
        <p>
          There&apos;s four options for sharing a solve with your &quot;friends&quot;.
        </p>
        <div className="flex flex-row gap-3 items-start">
          <div className="flex items-center justify-center ml-19 w-10 h-8 mt-0.75 rounded-sm border border-neutral-600 text-dark_accent select-none shrink-0">
            <ShareIcon />
          </div>
          <p>
            The easiest is the Share Preview button. 
            This is great for sharing anywhere that has link previews, like Discord.
            A preview image of the solve will get generated.
          </p>
        </div>
        <div className="flex flex-row gap-3 items-start">
          <div className="flex flex-col w-fit shrink-0 items-end">
            <div className="flex flex-col align-middle w-16 h-8 px-2 py-1 rounded-sm border border-neutral-600 text-dark_accent select-none">
              <div className="flex justify-center items-center w-full select-none space-x-2">
                <CopyIcon className="text-dark_accent" />
                <DropdownIcon className="align-middle h-full" />
              </div>
            </div>
            <div className="flex flex-col bg-primary-900 place-items-start text-dark_accent pb-1 text-sm">
              <div className="py-2 px-2 border border-neutral-600 w-full text-left flex items-center space-x-2">
                <TextTIcon className="w-4 h-4" />
                <span>Copy Text</span>
              </div>
              <div className="py-2 px-2 border border-neutral-600 w-full text-left flex items-center space-x-2">
                <CameraIcon className="w-4 h-4" />
                <span>Screenshot</span>
              </div>
              <div className="py-2 px-2 border border-neutral-600 w-full text-left flex items-center space-x-2">
                <PlayIcon className="w-4 h-4" />
                <span>Create GIF</span>
              </div>
            </div>
          </div>
          <p>
            The remaining three options are to create a text, image, or video version of your solve.
          </p>
        </div>
        <h3 className="py-1 text-lg mt-12 mb-2 pl-2 w-1/2 text-dark bg-primary-200">{`>>`} Take a pic</h3>                
        <div className="flex flex-row gap-3 items-start">
          <div className="shrink-0 p-1 w-8 h-8 mt-0.75 border border-neutral-600 bg-dark text-dark_accent rounded flex items-center justify-center">
            <TakePictureIcon />
          </div>
          <p>
            You can create an image of whatever the cube looks like, even showing setup moves. This is great for discussing cases.
          </p>
        </div>
        <Image
          src="/recon/cubeImageExample.png"
          alt="Example cube image"
          width={640}
          height={359}
          loading="lazy"
          className="w-fit object-contain"
        />
      </InfoPanelSection>

      <InfoPanelSection title="Learning from your solves">
        <p>
          There&apos;s an autocomplete functionality built into the Solution text editor. 
          It only works for CFOP solves. More coming soon!
        </p>
        <p>
          After you complete a recon, try adding a new line before a troublesome part of your solve.
          See what the autocomplete suggests. You may get some good ideas.
        </p>
        <Image
          src="/recon/suggestionExample.png"
          alt="Example suggestions"
          width={403}
          height={358}
          loading="lazy"
          className="w-fit object-contain"
        />
        <div className="text-dark flex flex-row gap-3 py-1 pr-3 mt-6 w-2/3 items-center bg-neutral-300">
          <QuestionIcon className="min-w-8 ml-3 min-h-8 text-light_accent"/>
          <div>
            Icons with a magenta border indicate the alg solves <a className="underline underline-offset-2" href="https://www.zzmethod.com/tutorial/eo" target="_blank">Edge Orientation</a> (EO).
          </div>
        </div>
        <p>
          OLL and PLL autocomplete suggestions are ranked by 
          frequency in <a className="underline underline-offset-2" href="https://reco.nz" target="_blank">reco.nz</a>.
          F2L suggestions are ranked imperfectly, but shorter solutions that use fast moves like R, L, U, and D
          are generally preferred.
        </p>
      </InfoPanelSection>

    </div>
  );
}
