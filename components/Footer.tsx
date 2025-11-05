import DiscordIcon from './icons/discord';
import GithubIcon from './icons/github';
import WriteIcon from './icons/write';
import { Glory } from 'next/font/google';
import Tagline from './Tagline';

const glory = Glory({ 
  subsets: ['latin'],
  variable: '--font-Glory' 
});

export default function Footer() {


  return (
    <footer className="col-span-full my-[52px]">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-[18px] text-gray-300">
      <div className={`text-2xl font-bold ${glory.variable} font-modern`}>
        AVERAGE OF ONE THOUSAND
      </div>
      <div className="text-center my-[4px]">
        <Tagline />
      </div>
      <a
        href="https://discord.gg/WMm6JBgt2W"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:text-primary-100"
      >
        <DiscordIcon />
        Connect on Discord
      </a>
      <a
        href="https://github.com/Ao1K/Ao1K_site"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:text-primary-100"
      >
        <GithubIcon />
        Contribute || Report bugs
      </a>
      </div>
    </footer>
  );
}