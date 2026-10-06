import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  // While checking session (page refresh etc.)
  if (loading) {
    return null; // or a spinner later
  }

  // If not logged in → kick to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Logged in → allow access
  return children;
}
