import type { ReactNode } from "react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function RoleProtectedLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute roles={["agent", "admin"]}>{children}</ProtectedRoute>;
}