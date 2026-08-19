import type { Metadata } from "next";

import AgentDirectory from "@/components/agents/AgentDirectory";

export const metadata: Metadata = {
  title: "Approved Agents and Landlords",
  description: "Browse approved HomeLink agents and landlords serving OOU communities.",
};

export default function AgentsPage() {
  return <AgentDirectory />;
}