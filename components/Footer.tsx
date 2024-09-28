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
    <footer className="bg-dark text-light justify-center items-center flex flex-col w-full py-16 h-1/3 -translate-y-1 ">
      <div id="blur-border" className="w-full xs:w-11/12 md:w-4/5 lg:w-3/5 xl:w-2/5 h-[20px] blur-xl bg-primary mb-24 ease-linear transition-width duration-500"/> 
      <div className="flex flex-col items-center">
        <div className={`text-2xl font-bold ${glory.variable} font-modern mb-3`}>
          AVERAGE OF ONE THOUSAND
          <div className='w-full h-[2px] bg-primary mt-5'></div>
        </div>
        <Tagline />
        <div className='w-full h-[2px] bg-primary mt-3'></div>
      </div>
      
      <div className="space-y-6 my-6 flex flex-col">
        <div className="flex flex-row space-x-2 items-center hover:underline underline-offset-4">
          <a href="https://discord.gg/ffXwKXB9" target="_blank" rel="noopener noreferrer" className="flex flex-row items-center hover:underline underline-offset-4">
            <DiscordIcon className='mr-2'/>
            Connect on Discord
          </a>
        </div>
        <div className="flex flex-row space-x-2 items-center hover:underline underline-offset-4">
          <a href="https://github.com/Ao1K/Ao1K_site" target="_blank" rel="noopener noreferrer" className="flex flex-row items-center hover:underline underline-offset-4">
            <GithubIcon className='mr-2'/>
            Contribute || Report bugs
          </a>
        </div>
      </div>
    </footer>
  );
}