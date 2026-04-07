import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Chip,
  Grid,
  Paper
} from "@mui/material";
import { motion } from "framer-motion";
import ShieldIcon from '@mui/icons-material/Shield';
import SpeedIcon from '@mui/icons-material/Speed';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

function Home() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f4ff 0%, #ffffff 50%, #e6eeff 100%)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Decorative Blobs */}
      <Box
        component={motion.div}
        animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        sx={{
          position: "absolute",
          top: "-10%",
          left: "-5%",
          width: "40vw",
          height: "40vw",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(255,255,255,0) 70%)",
          borderRadius: "50%",
          zIndex: 0,
        }}
      />
      <Box
        component={motion.div}
        animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        sx={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "50vw",
          height: "50vw",
          background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(255,255,255,0) 70%)",
          borderRadius: "50%",
          zIndex: 0,
        }}
      />

      {/* NAVBAR */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.3)",
          color: "text.primary",
          zIndex: 10
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldIcon color="primary" /> P2P OrgNet
          </Typography>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3 }}>
            <Button color="inherit" sx={{ fontWeight: 600 }}>Home</Button>
            <Button color="inherit" sx={{ fontWeight: 600 }}>Features</Button>
            <Button color="inherit" sx={{ fontWeight: 600 }}>Docs</Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="text"
              color="primary"
              sx={{ fontWeight: 600 }}
              onClick={() => navigate("/signin")}
            >
              Sign in
            </Button>
            <Button
              variant="contained"
              sx={{
                fontWeight: 600,
                borderRadius: '20px',
                px: 3,
                boxShadow: '0 8px 16px rgba(99,102,241,0.3)'
              }}
              onClick={() => navigate("/signup")}
            >
              Sign up
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* HERO SECTION */}
      <Container
        maxWidth="lg"
        component={motion.div}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        sx={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          py: 8
        }}
      >
        <motion.div variants={itemVariants}>
          <Chip
            label="✨ Secure peer-to-peer organization platform"
            sx={{
              mb: 4,
              fontWeight: 600,
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(10px)",
              color: "primary.main",
              border: "1px solid rgba(99,102,241,0.2)",
              px: 1,
              py: 2.5,
              fontSize: '0.9rem'
            }}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Typography
            variant="h1"
            fontWeight={900}
            sx={{
              mb: 3,
              lineHeight: 1.1,
              fontSize: { xs: '3.5rem', md: '5rem' },
              color: '#1e293b'
            }}
          >
            Build, Manage & Scale
            <br />
            <Box component="span" sx={{
              background: "linear-gradient(to right, #4f46e5, #3b82f6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Your P2P Organization
            </Box>
          </Typography>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Typography
            variant="h6"
            sx={{ maxWidth: 700, mb: 5, color: "#64748b", fontWeight: 400, lineHeight: 1.6 }}
          >
            A role-based, secure peer-to-peer platform designed for modern organizations. Manage users, permissions, procurement, and workflows with enterprise-grade control safely and securely.
          </Typography>
        </motion.div>

        {/* CTA BUTTONS */}
        <motion.div variants={itemVariants}>
          <Box display="flex" gap={3}>
            <Button
              size="large"
              variant="contained"
              onClick={() => navigate("/signup")}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: '30px',
                boxShadow: '0 10px 20px rgba(79, 70, 229, 0.3)',
                textTransform: 'none'
              }}
            >
              Get started for free
            </Button>

            <Button
              size="large"
              variant="outlined"
              onClick={() => navigate("/signin")}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: '30px',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                },
                textTransform: 'none',
                background: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(4px)'
              }}
            >
              Sign in
            </Button>
          </Box>
        </motion.div>

        {/* Features Preview */}
        <Grid container spacing={4} sx={{ mt: 10, textAlign: 'left' }}>
           {[
            { title: "Secure Procurement", desc: "Automate PO generation and GRN processing easily.", icon: <AccountTreeIcon fontSize="large" color="primary" /> },
            { title: "Real-time Verification", desc: "PO to GRN to Invoice matching for fraud prevention.", icon: <ShieldIcon fontSize="large" color="primary" /> },
            { title: "Role-based Access", desc: "Granular permissions for Admins, Finance, and Procurement.", icon: <SpeedIcon fontSize="large" color="primary" /> }
           ].map((feature, idx) => (
             <Grid item xs={12} md={4} key={idx}>
               <motion.div variants={itemVariants} whileHover={{ y: -10 }}>
                 <Paper
                   elevation={0}
                   sx={{
                     p: 4,
                     borderRadius: 4,
                     background: "rgba(255, 255, 255, 0.6)",
                     backdropFilter: "blur(20px)",
                     border: "1px solid rgba(255,255,255,0.8)",
                     boxShadow: "0 4px 30px rgba(0, 0, 0, 0.05)",
                     height: '100%'
                   }}
                 >
                   <Box sx={{ mb: 2, p: 2, display: 'inline-flex', borderRadius: 3, backgroundColor: 'rgba(79,70,229,0.1)' }}>
                     {feature.icon}
                   </Box>
                   <Typography variant="h6" fontWeight={700} mb={1} color="#1e293b">
                     {feature.title}
                   </Typography>
                   <Typography variant="body2" color="#64748b" lineHeight={1.6}>
                     {feature.desc}
                   </Typography>
                 </Paper>
               </motion.div>
             </Grid>
           ))}
        </Grid>

      </Container>
    </Box>
  );
}

export default Home;
