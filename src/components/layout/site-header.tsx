import { Brand } from "./brand";
import { SiteNav } from "./site-nav";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Brand label="CatchUp home" />
        <SiteNav />
        <ThemeToggle />
      </div>
    </header>
  );
}
