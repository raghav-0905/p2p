import { supabase } from "../lib/supabase";

function Dashboard() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/signin";
  };

  return (
    <div style={styles.container}>
      <h1>Dashboard</h1>
      <p>You are logged in 🎉</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
  },
};

export default Dashboard;
