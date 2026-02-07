import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const userId = data.user.id;

    // 🔑 Fetch role immediately
    const { data: orgUser, error: orgError } = await supabase
      .from("organization_users")
      .select("role, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (orgError || !orgUser) {
      // user exists but no org yet
      navigate("/", { replace: true });
      return;
    }

    // 🎯 Deterministic navigation
    if (orgUser.role === "org_admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/user", { replace: true });
    }
  };

  return (
    <form onSubmit={handleSignIn} style={styles.form}>
      <h2>Sign In</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit">Sign In</button>
    </form>
  );
}

const styles = {
  form: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "15px",
  },
};

export default SignIn;
