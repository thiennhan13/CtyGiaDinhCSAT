import { PublicNavigation } from './PublicNavigation';
import './public-design.css';

/** Same navigation on entry/account pages, without marketing main/footer styles. */
export function PublicHeader() {
  return <div className="csat-public public-header-only print:hidden"><PublicNavigation />
    <noscript><style>{'.public-header-only .nav-links{display:flex;position:static;flex-wrap:wrap;flex-direction:row;max-height:none;flex-basis:100%}.public-header-only .navbar{flex-wrap:wrap}.public-header-only .menu-button,.public-header-only .contact-dock{display:none}'}</style></noscript>
  </div>;
}
