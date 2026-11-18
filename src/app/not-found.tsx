import { CatchUpMissing } from "@/components/catchup/catchup-missing";

export default function NotFound() {
  return (
    <CatchUpMissing
      title="Nothing here. Just noise."
      body="This page doesn't exist, or the link was cut short. Your catch-ups are under Saved, or you can start a new one."
      action={{ href: "/", label: "Back to CatchUp" }}
    />
  );
}
