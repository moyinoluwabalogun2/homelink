import type { Metadata } from "next";

import AgentProfileClient from "@/components/agents/AgentProfileClient";

export const metadata: Metadata = {
  title: "Agent Profile",
};

export default function AgentProfilePage({
  params,
}: {
  params: { profileId: string };
}) {
  return <AgentProfileClient profileId={params.profileId} />;
}