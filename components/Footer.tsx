import DiscordIcon from './icons/discord';
import GithubIcon from './icons/github';
import WriteIcon from './icons/write';
import { Glory } from 'next/font/google';
import Link from 'next/link';
import Tagline from './Tagline';

const glory = Glory({ 
  subsets: ['latin'],
  variable: '--font-Glory',
  preload: false,
});

const repoUrl = 'https://github.com/Ao1K/Ao1K_site';

export default function Footer({ lessonSlug }: { lessonSlug?: string }) {


  return (
    <footer className="col-span-full my-[52px]">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-[18px] text-gray-300">
      <div className={`text-2xl font-bold ${glory.variable} text-center font-modern`}>
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
        href={repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:text-primary-100"
      >
        <GithubIcon />
        Contribute || Report bugs
      </a>
      <Link href="/credits" className="hover:text-primary-100">
        Alg credits
      </Link>
      {lessonSlug && (
        <>
          <a
            href={`${repoUrl}/commits/main/components/learn/postContent/${lessonSlug}.tsx`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-100"
          >
            Lesson contributions
          </a>
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="license noopener noreferrer"
            className="text-center hover:text-primary-100"
          >
            Lesson by Ao1K and contributors,
            <br />
            licensed under CC BY 4.0
          </a>
        </>
      )}
      </div>
    </footer>
  );
}