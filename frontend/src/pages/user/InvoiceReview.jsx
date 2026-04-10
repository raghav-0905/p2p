import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { motion } from "framer-motion";

const STATUS_COLORS = {
  submitted: "info",
  under_review: "warning",
  approved: "success",
  rejected: "error",
  paid: "success"
};

export default function InvoiceReview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [pos, setPos] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgUser } = await supabase
        .from("organization_users")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!orgUser) return;
      const orgId = orgUser.org_id;

      // Fetch invoices
      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (invError) throw invError;
      setInvoices(invData || []);

      // Fetch POs so we can display PO numbers
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .select("id, po_number")
        .eq("org_id", orgId);
      
      if (poError) throw poError;
      setPos(poData || []);

    } catch (err) {
      console.error(err);
      setSnack({ open: true, message: "Failed to load invoices", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const getPoNumber = (poId) => {
    const po = pos.find(p => p.id === poId);
    return po ? po.po_number : poId;
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      setSnack({ open: true, message: `Invoice marked as ${newStatus}`, severity: "success" });
      
      // Update local state to avoid refetching everything
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
      
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice({ ...selectedInvoice, status: newStatus });
      }

    } catch (err) {
      console.error("Status update error:", err);
      setSnack({ open: true, message: "Failed to update status", severity: "error" });
    }
  };

  const openDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id);
      
      if (error) throw error;
      setInvoiceItems(data || []);
    } catch (err) {
      console.error(err);
      setInvoiceItems([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSimulatePayment = async (invoice) => {
    try {
      // 1. Mark Invoice as Paid
      await handleUpdateStatus(invoice.id, "paid");

      // 2. Insert into Payments table (assumes table exists)
      const { error: payError } = await supabase
        .from("payments")
        .insert({
          invoice_id: invoice.id,
          amount: invoice.total_amount,
          status: "paid"
        });

      if (payError) {
        console.error("Failed to insert payment record:", payError);
        // Continue anyway to close PO if needed
      }

      // 3. Robust verification via validation layer
      try {
        const response = await fetch('http://localhost:3001/api/validate/validate-po-closure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ po_id: invoice.po_id })
        });
        const data = await response.json();
        
        if (data.success && data.closed) {
           setSnack({ open: true, message: "Payment processed & PO closed!", severity: "success" });
        } else {
           setSnack({ open: true, message: "Payment processed successfully", severity: "success" });
        }
      } catch (e) {
        console.error("Failed to trigger validation API", e);
        setSnack({ open: true, message: "Payment processed successfully (validation unreachable)", severity: "success" });
      }
    } catch (err) {
      console.error(err);
      setSnack({ open: true, message: "Error processing payment", severity: "error" });
    }
  };

  return (
    <Box minHeight="100vh" bgcolor="#f8fafc">
      <AppBar position="static" elevation={0} sx={{ background: "#fff", color: "#1e293b", borderBottom: "1px solid #e2e8f0" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate("/user")}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ ml: 2, fontWeight: 700, color: "#4f46e5" }}>Invoice Review</Typography>
        </Toolbar>
      </AppBar>

      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        p={4}
        maxWidth="1400px"
        mx="auto"
      >
        <Typography variant="h4" fontWeight={800} mb={1} color="#0f172a">
          Invoice Management
        </Typography>
        <Typography color="text.secondary" mb={4}>
          Review submitted invoices, check item details, and approve or reject them.
        </Typography>

        <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={6}>
              <CircularProgress />
            </Box>
          ) : invoices.length === 0 ? (
            <Box p={6} textAlign="center">
              <Typography color="text.secondary">No invoices found for your organization.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>PO Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Amount (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell><Typography fontWeight={600}>{inv.invoice_number}</Typography></TableCell>
                      <TableCell>{inv.invoice_date || "—"}</TableCell>
                      <TableCell>{inv.supplier_name}</TableCell>
                      <TableCell>{getPoNumber(inv.po_id)}</TableCell>
                      <TableCell>₹{Number(inv.total_amount || 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Chip size="small" label={inv.status?.replace("_", " ")} color={STATUS_COLORS[inv.status] || "default"} />
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          startIcon={<VisibilityIcon />} 
                          onClick={() => openDetails(inv)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {/* Invoice Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {selectedInvoice && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              Invoice: {selectedInvoice.invoice_number}
            </DialogTitle>
            <DialogContent dividers>
              <Box display="flex" justifyContent="space-between" mb={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Supplier</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedInvoice.supplier_name}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{selectedInvoice.invoice_date}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">PO Number</Typography>
                  <Typography variant="body1">{getPoNumber(selectedInvoice.po_id)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    ₹{Number(selectedInvoice.total_amount || 0).toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="h6" mb={2} fontSize="1rem">Line Items</Typography>
              {detailLoading ? (
                <Box display="flex" justifyContent="center" p={3}><CircularProgress size={30}/></Box>
              ) : invoiceItems.length === 0 ? (
                <Typography color="text.secondary" mb={3}>No itemized details provided.</Typography>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", mb: 3 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "#f8fafc" }}>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell align="right">Taxable</TableCell>
                        <TableCell align="right">GST</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoiceItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_name_snapshot}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">₹{item.unit_price}</TableCell>
                          <TableCell align="right">₹{item.taxable_value}</TableCell>
                          <TableCell align="right">₹{item.gst_amount} ({item.gst_rate_snapshot}%)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>₹{item.total_amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary" display="inline" mr={2}>
                  Current Status: <Chip size="small" label={selectedInvoice.status?.replace("_", " ")} color={STATUS_COLORS[selectedInvoice.status] || "default"} />
                </Typography>
              </Box>
              <Box gap={1} display="flex">
                <Button onClick={() => setDetailOpen(false)} color="inherit">Close</Button>
                {selectedInvoice.status === "submitted" && (
                  <Button 
                    variant="outlined" 
                    color="warning"
                    onClick={() => handleUpdateStatus(selectedInvoice.id, "under_review")}
                  >
                    Mark "Under Review"
                  </Button>
                )}
                {["submitted", "under_review"].includes(selectedInvoice.status) && (
                  <>
                    <Button 
                      variant="contained" 
                      color="error"
                      onClick={() => handleUpdateStatus(selectedInvoice.id, "rejected")}
                    >
                      Reject
                    </Button>
                    <Button 
                      variant="contained" 
                      color="success"
                      onClick={() => handleUpdateStatus(selectedInvoice.id, "approved")}
                    >
                      Approve
                    </Button>
                  </>
                )}
                {selectedInvoice.status === "approved" && (
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => {
                        handleSimulatePayment(selectedInvoice);
                        setDetailOpen(false);
                    }}
                  >
                    Make Payment
                  </Button>
                )}
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar 
        open={snack.open} 
        autoHideDuration={4000} 
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
