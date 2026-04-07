import UserDashboard from '../user/UserDashboard';

// Mirroring the new UserDashboard for Admin as well to provide UI parity
export default function AdminDashboard() {
  return <UserDashboard />;
}
