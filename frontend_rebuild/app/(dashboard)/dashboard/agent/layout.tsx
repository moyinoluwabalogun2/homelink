import type { ReactNode } from "react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function AgentWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ProtectedRoute roles={["agent"]}>{children}</ProtectedRoute>;
}