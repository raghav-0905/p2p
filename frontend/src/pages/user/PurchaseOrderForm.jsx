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
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { motion } from "framer-motion";

function PurchaseOrderForm() {
  const navigate = useNavigate();
  const [poNumber, setPoNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierGstin, setSupplierGstin] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [poDate, setPoDate] = useState("");
  const [totalTaxableValue, setTotalTaxableValue] = useState("");
  const [totalGstValue, setTotalGstValue] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
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

    const { error } = await supabase.from("purchase_orders").insert([
      {
        org_id: orgData.org_id,
        po_number: poNumber,
        po_date: poDate,
        supplier_name: supplierName,
        supplier_gstin: supplierGstin || null,
        supplier_address: supplierAddress || null,
        total_taxable_value: totalTaxableValue ? parseFloat(totalTaxableValue) : null,
        total_gst_value: totalGstValue ? parseFloat(totalGstValue) : null,
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        created_by: user.id,
      },
    ]);

    setLoading(false);
    if (error) {
      setToast({ open: true, msg: error.message, severity: "error" });
    } else {
      setToast({ open: true, msg: "Purchase Order created successfully!", severity: "success" });
      setPoNumber("");
      setSupplierName("");
      setSupplierGstin("");
      setSupplierAddress("");
      setPoDate("");
      setTotalTaxableValue("");
      setTotalGstValue("");
      setTotalAmount("");
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
              <ReceiptLongIcon color="primary" fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#0f172a">
                New Purchase Order
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fill in the details below to create a new PO.
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="PO Number" margin="normal" required value={poNumber} onChange={(e) => setPoNumber(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <TextField fullWidth type="date" label="PO Date" margin="normal" required InputLabelProps={{ shrink: true }} value={poDate} onChange={(e) => setPoDate(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <TextField fullWidth label="Supplier Name" margin="normal" required value={supplierName} onChange={(e) => setSupplierName(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <TextField fullWidth label="Supplier GSTIN" margin="normal" value={supplierGstin} onChange={(e) => setSupplierGstin(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <TextField fullWidth label="Supplier Address" margin="normal" multiline rows={2} value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />

            <Divider sx={{ my: 2 }}><Typography variant="caption" color="text.secondary">Financial Details</Typography></Divider>

            <TextField fullWidth label="Total Taxable Value (₹)" margin="normal" type="number" value={totalTaxableValue} onChange={(e) => setTotalTaxableValue(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <TextField fullWidth label="Total GST Value (₹)" margin="normal" type="number" value={totalGstValue} onChange={(e) => setTotalGstValue(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <TextField fullWidth label="Total Amount (₹)" margin="normal" type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />

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
              {loading ? "Creating..." : "Create Purchase Order"}
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

export default PurchaseOrderForm;