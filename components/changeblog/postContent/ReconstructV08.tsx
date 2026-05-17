import Image from "next/image";
import CopyIcon from "../../icons/copy";
import DropdownIcon from "../../icons/dropdown";
import TextTIcon from "../../icons/text-T";
import CameraIcon from '../../icons/image';
import TakePictureIcon from '../../icons/camera';
import PlayIcon from "../../icons/play";

export default function ReconstructV08() {
  return (
    <>
      <div className="flex flex-row gap-2 ">
        <h1 className="text-3xl text-primary-300">Reconstruct v0.8</h1>
        <div className="h-fit self-end pb-0.5 text-neutral-400">May 16th, 2026</div>
      </div>
      <div className="bg-primary-100 w-full h-1"></div>
      <div className="pt-6 gap-1 flex flex-col">
        <p>In much the way that I cannot explain my own thoughts, I cannot explain beauty.</p>
        <p>
          This is version 0.8 of the Reconstruct tool.
        </p>
        <ul className="pt-6 space-y-1 list-none text-neutral-400">
          <li>- Added GIF creation</li>
          <li>- Added cube image creation</li>
          <li>- Added a welcome message</li>
          <li>- Added splits and made move playback smoother</li>
        </ul>
      </div>
      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Welcoming</h2>
      <div className="flex flex-col gap-6">
        <p>
          When you first open the recon page, a panel will appear explaining
          how to use the tool and other tips and tricks. This replaces the welcome video, 
          which was clunky and getting out-of-date.
        </p>
      </div>
      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} GIIIIIFS!!!</h2>
      <div className="flex flex-col gap-6">
        <p>
          Someone told me if I added GIFs, they&apos;d use Ao1K. 
          I don&apos;t like to pander much to any one person, 
          but this did seem like a pretty interesting idea.
        </p>
        <Image
          src="/recon/reconSplash.gif"
          alt="Example cube solve reconstruction"
          width={320}
          height={320}
          unoptimized
          loading="lazy"
          className="w-full max-w-xs -my-6 object-contain"
        />
        <p>
          I went all-out with this. Lots of customization. 
          Do a recon, and then you can check it out from the dropdown 
          near the top of the Recon page:
        </p>
        <div className="flex flex-col w-fit shrink-0 items-start">
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
            <div className="py-2 px-2 border border-primary-100 w-full text-left flex items-center space-x-2">
              <PlayIcon className="w-4 h-4" />
              <span>Create GIF</span>
            </div>
          </div>
        </div>
      </div>
      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} Splits</h2>
      <div className="flex flex-col gap-6">
        <p>
          In the settings, you can enable addings splits. This is where you&apos;d specify
          how fast each line of the solve was. You have to enter the time in "ssmmm" format.
          If you don&apos;t have all these milliseconds handy, 
          just be sure to add a decimal point (for example: you&apos;ll type "1.0").
        </p>
        <p>
          These splits optionally connect to the GIF creation as well as the solve speed when you click
          {" "}<span className="whitespace-nowrap"><span className="inline-flex shrink-0 p-1 w-8 h-8 align-middle border border-neutral-600 bg-dark text-dark_accent rounded items-center justify-center">
            <PlayIcon />
          </span>.</span>
        </p>
      </div>
      <h2 className="py-2 text-xl mt-12 mb-3 pl-2 w-full text-dark bg-primary-300">{`>`} How do I solve this case?</h2>
      <div className="flex flex-col gap-6">
        <p>
          This update adds a way to take a picture of whatever the cube currently looks like.
        </p>
        <p className="-mt-6">
          Look for this icon next to the cube player:
          {" "}<span className="inline-flex shrink-0 p-1 w-8 h-8 align-middle border border-neutral-600 bg-dark text-dark_accent rounded items-center justify-center">
            <TakePictureIcon />
          </span>{". "}
          If it&apos;s not there, go into settings and check Show Player Controls.
        </p>
        <Image
          src="/recon/cubeImageExample.png"
          alt="Example cube image with setup moves"
          width={640}
          height={360}
          loading="lazy"
          className="w-full object-contain -my-3"
        />
        <p>
          It optionally adds a way to add setup moves to the image, 
          which makes it very useful as a visual aid when talking about cases.
        </p>
        <p>
          Go you beautiful bastard.
        </p>
      </div>
    </>
  );
}