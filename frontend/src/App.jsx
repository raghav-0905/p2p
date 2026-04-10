import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UserDashboard from "./pages/user/UserDashboard";

import PurchaseOrderForm from "./pages/user/PurchaseOrderForm";
import GRNForm from "./pages/user/GRNForm";

import AnalyticsDashboard from "./pages/user/AnalyticsDashboard";
import ProcurementOverview from "./pages/user/ProcurementOverview";
import InvoiceReview from "./pages/user/InvoiceReview";
import PurchaseRequestReview from "./pages/user/PurchaseRequestReview";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["org_admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* User Dashboard */}
      <Route
        path="/user"
        element={
          <ProtectedRoute allow={["finance", "procurement", "viewer"]}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      {/* Purchase Order Form */}
      <Route
        path="/purchase-order"
        element={
          <ProtectedRoute allow={["finance", "procurement"]}>
            <PurchaseOrderForm />
          </ProtectedRoute>
        }
      />

      {/* GRN Form */}
      <Route
        path="/grn"
        element={
          <ProtectedRoute allow={["finance", "procurement"]}>
            <GRNForm />
          </ProtectedRoute>
        }
      />

      {/* Analytics Dashboard */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allow={["finance", "procurement", "viewer"]}>
            <AnalyticsDashboard />
          </ProtectedRoute>
        }
      />

      {/* Procurement Overview */}
      <Route
        path="/procurement"
        element={
          <ProtectedRoute allow={["finance", "procurement", "viewer"]}>
            <ProcurementOverview />
          </ProtectedRoute>
        }
      />

      {/* Invoice Review */}
      <Route
        path="/invoice"
        element={
          <ProtectedRoute allow={["finance", "procurement"]}>
            <InvoiceReview />
          </ProtectedRoute>
        }
      />

      {/* Purchase Request Review */}
      <Route
        path="/purchase-requests"
        element={
          <ProtectedRoute allow={["finance", "procurement"]}>
            <PurchaseRequestReview />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}