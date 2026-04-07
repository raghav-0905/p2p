import { useState } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Link,
  Grid,
} from "@mui/material";
import { motion } from "framer-motion";
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
    <Grid container component="main" sx={{ height: '100vh' }}>
      {/* Left side: Form */}
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square sx={{ display: 'flex', alignItems: 'center', background: '#ffffff' }}>
        <Box
          component={motion.div}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 400,
            ml: 'auto',
            mr: 'auto'
          }}
        >
          <Typography component="h1" variant="h4" fontWeight={800} gutterBottom color="#1e293b">
            Join the Network
          </Typography>
          <Typography color="text.secondary" mb={4} textAlign="center">
            Create an account using your organization code.
          </Typography>

          <Box component="form" onSubmit={handleSignUp} sx={{ mt: 1, width: '100%' }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="orgCode"
                label="Organization Code"
                name="orgCode"
                autoFocus
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 4,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: '1rem',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                  background: 'linear-gradient(to right, #4f46e5, #3b82f6)'
                }}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
              <Typography variant="body2" align="center" sx={{ mt: 2, color: 'text.secondary' }}>
                Already have an account?{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={(e) => { e.preventDefault(); navigate("/signin"); }}
                  sx={{ fontWeight: 600, textDecoration: 'none' }}
                >
                  Log In
                </Link>
              </Typography>
            </motion.div>
          </Box>
        </Box>
      </Grid>

      {/* Right side: Branding / Illustration */}
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          component={motion.div}
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          sx={{
            position: "absolute",
            bottom: "10%",
            right: "20%",
            width: "40vw",
            height: "40vw",
            background: "radial-gradient(circle, #3b82f6 0%, rgba(255,255,255,0) 70%)",
            borderRadius: "50%",
            zIndex: 0,
          }}
        />
        <Box sx={{ zIndex: 1, textAlign: 'center', px: 4 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Typography variant="h3" fontWeight={800} gutterBottom>
              Empower Your Procurement
            </Typography>
            <Typography variant="h6" fontWeight={400} sx={{ opacity: 0.8, maxWidth: 500, mx: 'auto' }}>
              Join the organization network and streamline your PO, GRN, and Invoice processes instantly.
            </Typography>
          </motion.div>
        </Box>
      </Grid>
    </Grid>
  );
}
