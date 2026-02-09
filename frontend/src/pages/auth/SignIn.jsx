import { useState } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Link,
} from "@mui/material";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function SignIn() {
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

    const { data: orgUser } = await supabase
      .from("organization_users")
      .select("role, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!orgUser) {
      navigate("/", { replace: true });
      return;
    }

    navigate(orgUser.role === "org_admin" ? "/admin" : "/user", {
      replace: true,
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
                background:
          "linear-gradient(135deg, #f5f7ff 0%, #eef2ff 40%, #ffffff 100%)",
      }}
    >
      <Paper
        elevation={12}
        sx={{
          width: 420,
          p: 4,
          borderRadius: 4,
          backgroundColor: "white",
        }}
      >
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Welcome Back
        </Typography>

        <Typography color="text.secondary" mb={3}>
          Enter your email and password to access your account.
        </Typography>

        <Box component="form" onSubmit={handleSignIn}>
          <TextField
            fullWidth
            label="Email *"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <TextField
            fullWidth
            label="Password *"
            type="password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{
              mt: 3,
              py: 1.4,
              fontWeight: 600,
              borderRadius: 3,
            }}
          >
            Log In
          </Button>
        </Box>

        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 3, color: "text.secondary" }}
        >
          Don’t have an account?{" "}
          <Link
            component="button"
            underline="none"
            onClick={() => navigate("/signup")}
            sx={{ fontWeight: 600 }}
          >
            Register Now
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
