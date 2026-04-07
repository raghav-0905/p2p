import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Snackbar,
  Alert,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InventoryIcon from "@mui/icons-material/Inventory";
import { motion } from "framer-motion";

function GRNForm() {
  const navigate = useNavigate();
  const [poId, setPoId] = useState("");
  const [grnNumber, setGrnNumber] = useState("");
  const [grnDate, setGrnDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const user = (await supabase.auth.getUser()).data.user;
    const { data: orgData } = await supabase
      .from("organization_users")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase.from("grns").insert([
      {
        org_id: orgData.org_id,
        po_id: poId,
        grn_number: grnNumber,
        grn_date: grnDate,
        received_by: user.id,
      },
    ]);

    setLoading(false);
    if (error) {
      setToast({ open: true, msg: error.message, severity: "error" });
    } else {
      setToast({ open: true, msg: "GRN created successfully!", severity: "success" });
      setPoId("");
      setGrnNumber("");
      setGrnDate("");
    }
  };

  return (
    <Box minHeight="100vh" bgcolor="#f8fafc">
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ background: "#fff", color: "#1e293b", borderBottom: "1px solid #e2e8f0" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate("/user")}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ ml: 2, fontWeight: 700, color: "#4f46e5" }}>
          </Typography>
        </Toolbar>
      </AppBar>

      <Box display="flex" justifyContent="center" alignItems="center" minHeight="calc(100vh - 64px)" p={4}>
        <Paper
          component={motion.div}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 560,
            p: 5,
            borderRadius: 4,
            border: "1px solid #e2e8f0",
            background: "#fff",
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: "rgba(79,70,229,0.1)", display: "inline-flex" }}>
              <InventoryIcon color="primary" fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#0f172a">
                New Goods Receipt Note
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Record a goods receipt against an existing Purchase Order.
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Purchase Order ID" margin="normal" required value={poId} onChange={(e) => setPoId(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <TextField fullWidth label="GRN Number" margin="normal" required value={grnNumber} onChange={(e) => setGrnNumber(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <TextField fullWidth type="date" label="GRN Date" margin="normal" required InputLabelProps={{ shrink: true }} value={grnDate} onChange={(e) => setGrnDate(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: "1rem",
                textTransform: "none",
                boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
              }}
            >
              {loading ? "Creating..." : "Create GRN"}
            </Button>
          </Box>
        </Paper>
      </Box>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast({ ...toast, open: false })}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

export default GRNForm;