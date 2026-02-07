import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const { user, orgUser } = useAuth();

  return (
    <div style={{ padding: 40 }}>
      <h1>Admin Dashboard</h1>
      <pre>{JSON.stringify({ user, orgUser }, null, 2)}</pre>
    </div>
  );
}
