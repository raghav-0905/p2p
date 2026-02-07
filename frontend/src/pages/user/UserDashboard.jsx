import { useAuth } from "../../context/AuthContext";

export default function UserDashboard() {
  const { user, orgUser } = useAuth();

  return (
    <div style={{ padding: 40 }}>
      <h1>User Dashboard</h1>
      <pre>{JSON.stringify({ user, orgUser }, null, 2)}</pre>
    </div>
  );
}
