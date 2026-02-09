import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Chip,
} from "@mui/material";

function Home() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f5f7ff 0%, #eef2ff 40%, #ffffff 100%)",
      }}
    >
      {/* NAVBAR */}
      <AppBar
        position="static"
        elevation={0}
        sx={{ background: "transparent" }}
      >
        <Toolbar>
          <Typography fontWeight={800} sx={{ flexGrow: 1 }}>
            P2P OrgNet
          </Typography>

          <Button color="inherit">Home</Button>
          <Button color="inherit">Features</Button>
          <Button color="inherit">Docs</Button>

          <Button
            variant="contained"
            sx={{ ml: 2 }}
            onClick={() => navigate("/signup")}
          >
            Sign up
          </Button>
        </Toolbar>
      </AppBar>

      {/* HERO SECTION */}
      <Container
        maxWidth="md"
        sx={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Chip
          label="Secure peer-to-peer organization platform"
          sx={{ mb: 3, fontWeight: 500 }}
        />

        <Typography
          variant="h2"
          fontWeight={800}
          sx={{ mb: 2, lineHeight: 1.2 }}
        >
          Build, Manage & Scale
          <br />
          <Box component="span" color="primary.main">
            Your P2P Organization
          </Box>
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 600, mb: 4 }}
        >
          A role-based, secure peer-to-peer platform designed for modern
          organizations. Manage users, permissions, and workflows with
          enterprise-grade control.
        </Typography>

        {/* CTA BUTTONS */}
        <Box display="flex" gap={2}>
          <Button
            size="large"
            variant="contained"
            onClick={() => navigate("/signup")}
          >
            Get started for free
          </Button>

          <Button
            size="large"
            variant="outlined"
            onClick={() => navigate("/signin")}
          >
            Sign in
          </Button>
        </Box>

        {/* TRUSTED BY */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 6 }}
        >
          Trusted for secure access & collaboration
        </Typography>
      </Container>
    </Box>
  );
}

export default Home;
