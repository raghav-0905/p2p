import { useState, useEffect } from "react";
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
import ShieldIcon from '@mui/icons-material/Shield';
import { useAuth } from "../../context/AuthContext";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { user, orgUser, loading } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (orgUser) {
        navigate(orgUser.role === "org_admin" ? "/admin" : "/user", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, orgUser, loading, navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsSigningIn(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setIsSigningIn(false);
      return;
    }
  };

  return (
    <Grid container component="main" sx={{ height: '100vh' }}>
      {/* Left side: Branding / Illustration */}
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
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
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          sx={{
            position: "absolute",
            top: "10%",
            left: "20%",
            width: "30vw",
            height: "30vw",
            background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)",
            borderRadius: "50%",
            zIndex: 0,
          }}
        />
        <Box sx={{ zIndex: 1, textAlign: 'center', px: 4 }}>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
            <ShieldIcon sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h3" fontWeight={800} gutterBottom>
              P2P OrgNet
            </Typography>
            <Typography variant="h6" fontWeight={400} sx={{ opacity: 0.8, maxWidth: 500, mx: 'auto' }}>
              Secure, transparent, and efficient peer-to-peer enterprise management.
            </Typography>
          </motion.div>
        </Box>
      </Grid>

      {/* Right side: Form */}
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square sx={{ display: 'flex', alignItems: 'center', background: '#ffffff' }}>
        <Box
          component={motion.div}
          initial={{ opacity: 0, x: 20 }}
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
            Welcome Back
          </Typography>
          <Typography color="text.secondary" mb={4} textAlign="center">
            Sign in to continue to your dashboard.
          </Typography>

          <Box component="form" onSubmit={handleSignIn} sx={{ mt: 1, width: '100%' }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isSigningIn}
                sx={{
                  mt: 4,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: '1rem',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)'
                }}
              >
                {isSigningIn ? "Signing In..." : "Sign In"}
              </Button>
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <Typography variant="body2" align="center" sx={{ mt: 2, color: 'text.secondary' }}>
                Don't have an account?{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={(e) => { e.preventDefault(); navigate("/signup"); }}
                  sx={{ fontWeight: 600, textDecoration: 'none' }}
                >
                  Register Now
                </Link>
              </Typography>
            </motion.div>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
