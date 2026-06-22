import Shell from "@/components/shell/Shell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// All authenticated app routes live in this group. ProtectedRoute (client) gates
// access and Shell provides the sidebar/topbar chrome. The /login route is in a
// separate (auth) group with no Shell, so it is never guarded.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <Shell>{children}</Shell>
    </ProtectedRoute>
  );
}
