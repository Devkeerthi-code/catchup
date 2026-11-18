import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/account-panel";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <main id="main" className="shell account-page">
      <div className="page-head">
        <span className="eyebrow">Account</span>
        <h1>Log in or sign up</h1>
        <p>You only need an account to save catch-ups and open them on another device. Making a catch-up works without one.</p>
      </div>
      <AccountPanel />
    </main>
  );
}
