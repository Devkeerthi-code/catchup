import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeScript } from "@/components/layout/theme-script";
import { VisitorTracker } from "@/components/layout/visitor-tracker";
import { PressSprings } from "@/components/motion/press-springs";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "CatchUp: the few messages that matter in your group chat",
    template: "%s · CatchUp",
  },
  description:
    "Drop in a WhatsApp, Telegram, Slack or Discord export and get the deadlines, decisions, links and unanswered questions, each linked to the message it came from. Names and numbers are masked in your browser first.",
  applicationName: "CatchUp",
};

export const viewport: Viewport = {
  // Light by default; ThemeToggle switches it to the dark colour when dark is picked.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <ThemeScript />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <ToastProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </ToastProvider>
        <PressSprings />
        <VisitorTracker />
      </body>
    </html>
  );
}
