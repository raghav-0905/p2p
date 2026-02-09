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

export default function SignUp() {
  const [orgCode, setOrgCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      /* 1️⃣ Validate organization code */
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, is_active")
        .eq("org_code", orgCode.trim())
        .maybeSingle();

      if (orgError || !org) {
        alert("Invalid organization code");
        setLoading(false);
        return;
      }

      if (!org.is_active) {
        alert("Organization is inactive");
        setLoading(false);
        return;
      }

      /* 2️⃣ Create auth user */
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      /* 3️⃣ Insert into organization_users */
      const { error: joinError } = await supabase
        .from("organization_users")
        .insert({
          org_id: org.id,
          user_id: userId,
          role: "viewer",   // default role
          status: "active", // or "invited" if you want approval flow
        });

      if (joinError) {
        console.error(joinError);
        alert("Account created, but failed to join organization");
        setLoading(false);
        return;
      }

      /* 4️⃣ Redirect to Sign In */
      navigate("/signin", { replace: true });
    } finally {
      setLoading(false);
    }
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
        <Typography variant="h5" fontWeight={700}>
          Join Organization
        </Typography>

        <Typography color="text.secondary" mb={3}>
          Enter your organization code to create an account.
        </Typography>

        <Box component="form" onSubmit={handleSignUp}>
          <TextField
            fullWidth
            label="Organization Code *"
            margin="normal"
            value={orgCode}
            onChange={(e) => setOrgCode(e.target.value)}
            required
          />

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
            disabled={loading}
            sx={{
              mt: 3,
              py: 1.4,
              fontWeight: 600,
              borderRadius: 3,
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </Box>

        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 3, color: "text.secondary" }}
        >
          Already have an account?{" "}
          <Link
            component="button"
            underline="none"
            onClick={() => navigate("/signin")}
            sx={{ fontWeight: 600 }}
          >
            Log in
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
