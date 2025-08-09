import DiscordIcon from './icons/discord';
import GithubIcon from './icons/github';
import { Glory } from 'next/font/google';
import Tagline from './Tagline';

const glory = Glory({ 
  subsets: ['latin'],
  variable: '--font-Glory' 
});

export default function Footer() {


  return (
    <footer className="col-span-full bg-primary-900">
      <div className="text-gray-300 justify-center items-center col-start-2 col-span-1 py-12 h-1/3">
         
        <div className="flex flex-col items-center mb-8">
          <div className={`text-2xl mb-8  font-bold ${glory.variable} font-modern`}>AVERAGE OF ONE THOUSAND</div>
          <Tagline />
        </div>
        
        <div className="space-y-6 my-6 flex flex-col items-center">
          <div className="flex flex-row space-x-2 items-center hover:underline underline-offset-4">
            <a href="https://discord.gg/WMm6JBgt2W" target="_blank" rel="noopener noreferrer" className="flex flex-row hover:text-primary-100 items-center hover:underline underline-offset-4 ">
              <DiscordIcon className='mr-2'/>
              Connect on Discord
            </a>
          </div>
          <div className="flex flex-row space-x-2 items-center hover:underline underline-offset-4">
            <a href="https://github.com/Ao1K/Ao1K_site" target="_blank" rel="noopener noreferrer" className="flex flex-row hover:text-primary-100 items-center hover:underline underline-offset-4">
              <GithubIcon className='mr-2'/>
              Contribute || Report bugs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}