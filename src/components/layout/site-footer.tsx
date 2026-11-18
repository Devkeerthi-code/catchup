import Link from "next/link";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer__grid">
          <div>
            <Brand />
            <p className="mt-3 max-w-md">
              Turns a noisy group chat into the few things you need to act on. Chats shown as examples on this site are fictional
              demo data.
            </p>
            <div className="noise footer-noise" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>
          <nav aria-label="Product">
            <h2>Product</h2>
            <ul>
              <li><Link href="/import">Import a chat</Link></li>
              <li><Link href="/demo">Demo catch-up</Link></li>
              <li><Link href="/saved">Saved catch-ups</Link></li>
            </ul>
          </nav>
          <nav aria-label="Help">
            <h2>Help</h2>
            <ul>
              <li><Link href="/#how-title">How to export a chat</Link></li>
              <li><Link href="/#faq-title">Privacy</Link></li>
              <li><Link href="/account">Account</Link></li>
            </ul>
          </nav>
        </div>
        <div className="site-footer__base">
          <span>Names and numbers are masked in your browser before anything is sent.</span>
          <span>Raw chats are never stored.</span>
        </div>
      </div>
    </footer>
  );
}
