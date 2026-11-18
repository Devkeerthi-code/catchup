import type { Metadata } from "next";
import { SavedCatchUp } from "@/components/saved/saved-catchup";

export const metadata: Metadata = { title: "Saved catch-up" };

export default async function SavedCatchUpPage(props: PageProps<"/saved/[id]">) {
  const { id } = await props.params;
  return <SavedCatchUp id={id} />;
}
