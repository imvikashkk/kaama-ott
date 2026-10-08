import { HeaderAction, IconHelp } from './SiteChrome';

// Header link to /support — used on the subscription page
export default function SupportButton() {
  return (
    <HeaderAction href="/support">
      <IconHelp s={14} /> <span className="hidden sm:inline">Support</span>
    </HeaderAction>
  );
}
