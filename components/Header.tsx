import HeaderNavLink from './HeaderNavLink';
import WriteIcon from './icons/write';
// import DatabaseIcon from './icons/database';
// import TimerIcon from './icons/timer';
import BulletListIcon from './icons/bulletList';
import HeaderSidebar from './HeaderSidebar';

const versionList = {
  "recon": "v0.5",
  "changeblog": "",
}

export default function Header() {
  return (
    <div className="absolute bg-white text-light_accent w-full z-40 h-16 top-0">
      <nav className="mx-auto flex justify-between w-full">

        <img
          src="/Ao1K Logo v2.svg"
          className="h-16 w-auto overflow-visible"
        />

        <div className="hidden sm:flex p-4 mt-1 flex-row space-x-10">
          <div>
          {/* <HeaderNavLink href="/" title="Practice" icon={<TimerIcon />} /> */}
          </div>
          <HeaderNavLink href="/recon/" title="Reconstruct" icon={<WriteIcon />} version={versionList['recon']}/>
          {/* <HeaderNavLink href="/algs" title="Learn" icon={<DatabaseIcon />} /> */}
          <HeaderNavLink href="/changeblog/" title="Changeblog" icon={<BulletListIcon />} version={versionList['changeblog']} />
        </div>

        <div className="p-4 mt-1 hidden sm:block">
          {/* <Link href="https://login-ao1k.auth.us-east-1.amazoncognito.com">Profile</Link> */}
          By Chet
        </div>

        <HeaderSidebar />
      </nav>
    </div>
  );
}
