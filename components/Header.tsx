import HeaderNavLink from './HeaderNavLink';
import WriteIcon, { PhNotePencilFill } from './icons/write';
import GlassesIcon from './icons/glasses';
// import TimerIcon from './icons/timer';
import BulletListIcon from './icons/bulletList';
import DatabaseIcon, { PhDatabaseFill } from './icons/database';
import HeaderSidebar from './HeaderSidebar';
import HeaderShell from './HeaderShell';
import SettingsMenuWrapper from './SettingsMenuWrapper';
import { versionList } from '../utils/sharedConstants';

export default function Header() {
  return (
    <HeaderShell>
      <img
        src="/Ao1K-Logo-v2.svg"
        className="h-16 w-auto overflow-visible"
      />
      <nav className="w-full flex sm:justify-center relative justify-start">
       <div className="hidden sm:flex sm:flex-row items-center space-x-10">
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
      <div className="flex items-center">
        {/* <Link href="https://login-ao1k.auth.us-east-1.amazoncognito.com">Profile</Link> */}
        <SettingsMenuWrapper />
        <HeaderSidebar />
      </div>
    </HeaderShell>
  );
}
