import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UserDashboard from "./pages/user/UserDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["org_admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* User */}
      <Route
        path="/user"
        element={
          <ProtectedRoute allow={["finance", "procurement", "viewer"]}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
