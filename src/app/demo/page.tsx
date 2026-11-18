import type { Metadata } from "next";
import { DemoCatchUp } from "@/components/catchup/demo-catchup";

export const metadata: Metadata = {
  title: "Demo catch-up",
  description: "What a CatchUp result looks like, using a fictional class group.",
};

export default function DemoPage() {
  return <DemoCatchUp />;
}
