import type { Metadata } from "next";
import { LocalCatchUp } from "@/components/catchup/local-catchup";

export const metadata: Metadata = { title: "Your catch-up" };

export default async function CatchUpPage(props: PageProps<"/catchup/[id]">) {
  const { id } = await props.params;
  return <LocalCatchUp id={id} />;
}
