import DiscordIcon from './icons/discord';
import GithubIcon from './icons/github';
import { Glory } from 'next/font/google';
import Tagline from './Tagline';

const glory = Glory({ 
  subsets: ['latin'],
  variable: '--font-Glory' 
});

export default function Footer(): JSX.Element {


  return (
    <footer className="col-span-full bg-dark">
      <div className="text-gray-300 justify-center items-center col-start-2 col-span-1 py-12 h-1/3">
         
        <div className="flex flex-col items-center ">
          <div className={`mb-3 justify-items-center`}>
            <div className={`text-2xl  font-bold ${glory.variable} font-modern`}>AVERAGE OF ONE THOUSAND</div>
            <div className='w-full h-[2px] bg-primary mt-5 mb-3'></div>
            <Tagline />
            <div className='w-full h-[2px] bg-primary mt-3'></div>
          </div>
        </div>
        
        <div className="space-y-6 my-6  col-start-2 col-span-1 justify-items-center">
          <div className="flex flex-row space-x-2 items-center hover:underline underline-offset-4">
            <a href="https://discord.gg/WMm6JBgt2W" target="_blank" rel="noopener noreferrer" className="flex flex-row hover:text-light items-center hover:underline underline-offset-4 ">
              <DiscordIcon className='mr-2'/>
              Connect on Discord
            </a>
          </div>
          <div className="flex flex-row space-x-2 items-center hover:underline underline-offset-4">
            <a href="https://github.com/Ao1K/Ao1K_site" target="_blank" rel="noopener noreferrer" className="flex flex-row hover:text-light items-center hover:underline underline-offset-4">
              <GithubIcon className='mr-2'/>
              Contribute || Report bugs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}