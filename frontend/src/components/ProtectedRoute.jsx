import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allow, children }) {
  const { user, orgUser, loading } = useAuth();

  // ⏳ Still resolving auth + org
  if (loading) {
    return null; // or a spinner later
  }

  // 🚫 Not logged in
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // 🚫 Logged in but no org mapping
  if (!orgUser) {
    return <Navigate to="/" replace />;
  }

  // 🚫 Inactive user
  if (orgUser.status !== "active") {
    return <Navigate to="/" replace />;
  }

  // 🚫 Wrong role
  if (!allow.includes(orgUser.role)) {
    return <Navigate to="/" replace />;
  }

  // ✅ Allowed
  return children;
}
