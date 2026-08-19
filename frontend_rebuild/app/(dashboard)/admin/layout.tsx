import type { ReactNode } from "react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute roles={["admin"]}>{children}</ProtectedRoute>;
}