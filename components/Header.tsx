import HeaderNavLink from './HeaderNavLink';
import WriteIcon from './icons/write';
// import DatabaseIcon from './icons/database';
// import TimerIcon from './icons/timer';
import BulletListIcon from './icons/bulletList';
import HeaderSidebar from './HeaderSidebar';
import SettingsMenu from './SettingsMenu';

const versionList = {
  "recon": "v0.5",
  "changeblog": "",
}

export default function Header() {
  return (
    <div className="absolute bg-white flex flex-row text-light_accent w-full z-40 h-16 top-0">
      <img
        src="/Ao1K Logo v2.svg"
        className="h-16 w-auto overflow-visible"
      />
      <nav className="w-full flex sm:justify-center relative justify-start">
       <div className="hidden sm:flex sm:flex-row items-center space-x-10">
          {/* <HeaderNavLink href="/" title="Practice" icon={<TimerIcon />} /> */}
          <HeaderNavLink href="/recon/" title="Reconstruct" icon={<WriteIcon />} version={versionList['recon']}/>
          {/* <HeaderNavLink href="/algs" title="Learn" icon={<DatabaseIcon />} /> */}
          <HeaderNavLink href="/changeblog/" title="Changeblog" icon={<BulletListIcon />} version={versionList['changeblog']} />
        </div>


        <HeaderSidebar />
      </nav>
      <div className="flex items-center">
        {/* <Link href="https://login-ao1k.auth.us-east-1.amazoncognito.com">Profile</Link> */}
        <SettingsMenu/>
      </div>
    </div>
  );
}
