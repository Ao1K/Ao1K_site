import HeaderNavLink from './HeaderNavLink';
import WriteIcon, { PhNotePencilFill } from './icons/write';
import GlassesIcon from './icons/glasses';
// import TimerIcon from './icons/timer';
import BulletListIcon from './icons/bulletList';
import DatabaseIcon, { PhDatabaseFill } from './icons/database';
import HeaderSidebar from './HeaderSidebar';
import SettingsMenuWrapper from './SettingsMenuWrapper';
import { versionList } from '../utils/sharedConstants';

export default function Header() {
  return (
    <div className="absolute bg-primary-200 grid grid-cols-[1fr_auto_1fr] text-light_accent w-full z-45 h-16 top-0">
      <img
        src="/Ao1K-Logo-v2.svg"
        className="h-16 w-auto max-w-none overflow-visible justify-self-start"
      />
      <nav className="flex">
       <div className="hidden md:flex md:flex-row items-center space-x-10">
          {/* <HeaderNavLink href="/" title="Practice" icon={<TimerIcon />} /> */}
          {/* <HeaderNavLink href="/learn" title="Learn" icon={<GlassesIcon />} version={versionList['learn']}/> */}
          <HeaderNavLink href="/recon/" title="Reconstruct" version={versionList['recon']}
            icon={<WriteIcon className="w-6 h-6" />}
            iconFill={<PhNotePencilFill className="w-6 h-6" />} />
          <HeaderNavLink href="/algs/" title="Algs" version={versionList['algs']}
            icon={<DatabaseIcon className="w-6 h-6" />}
            iconFill={<PhDatabaseFill className="w-6 h-6" />} />
          <HeaderNavLink href="/changeblog/" title="Changeblog" icon={<BulletListIcon />} version={versionList['changeblog']} />
        </div>


      </nav>
      <div className="flex items-center justify-self-end">
        {/* <Link href="https://login-ao1k.auth.us-east-1.amazoncognito.com">Profile</Link> */}
        <SettingsMenuWrapper />
        <HeaderSidebar />
      </div>
    </div>
  );
}
