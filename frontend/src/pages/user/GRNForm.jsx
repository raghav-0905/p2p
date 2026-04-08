import { useEffect, useMemo, useState } from "react";
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
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InventoryIcon from "@mui/icons-material/Inventory";
import { motion } from "framer-motion";

function GRNForm() {
  const navigate = useNavigate();
  const [poId, setPoId] = useState("");
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [receivedItems, setReceivedItems] = useState([]);
  const [grnNumber, setGrnNumber] = useState("");
  const [grnDate, setGrnDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

  useEffect(() => {
    const fetchPOs = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const { data: orgData } = await supabase
        .from("organization_users")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      if (!orgData?.org_id) return;

      const { data } = await supabase
        .from("purchase_orders")
        .select("id, po_number, status")
        .eq("org_id", orgData.org_id)
        .in("status", ["acknowledged", "partially_received"]);
      setPurchaseOrders(data || []);
    };
    fetchPOs();
  }, []);

  const totalReceivedQty = useMemo(
    () => receivedItems.reduce((sum, i) => sum + Number(i.received_qty || 0), 0),
    [receivedItems]
  );

  const handlePoSelect = (value) => {
    setPoId(value);
    const po = purchaseOrders.find((p) => p.po_number === value) || null;
    setSelectedPO(po);
    if (!po?.id) {
      setReceivedItems([]);
      return;
    }
    supabase
      .from("purchase_order_items")
      .select("id, item_name_snapshot, quantity, unit_price")
      .eq("po_id", po.id)
      .then(({ data }) => {
        const rows = (data || []).map((item) => ({
          id: item.id,
          name: item.item_name_snapshot,
          ordered_qty: Number(item.quantity || 0),
          received_qty: Number(item.quantity || 0),
          accepted_qty: Number(item.quantity || 0),
          rejected_qty: 0,
          rate: Number(item.unit_price || 0),
        }));
        setReceivedItems(rows);
      });
  };

  const handleItemQtyChange = (id, field, value) => {
    setReceivedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const val = Number(value || 0);
          return { ...item, [field]: val };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    for (let item of receivedItems) {
      if (item.received_qty !== item.accepted_qty + item.rejected_qty) {
        setToast({ 
          open: true, 
          msg: `Quantities mismatch for ${item.name}. Received (${item.received_qty}) must equal Accepted (${item.accepted_qty}) + Rejected (${item.rejected_qty}).`, 
          severity: "error" 
        });
        return;
      }
    }

    setLoading(true);

    const user = (await supabase.auth.getUser()).data.user;
    const { data: orgData } = await supabase
      .from("organization_users")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    const { data: createdGrn, error } = await supabase.from("grns").insert([
      {
        org_id: orgData.org_id,
        po_id: selectedPO?.id,
        grn_number: grnNumber,
        grn_date: grnDate,
        received_by: user.id,
      },
    ]).select("id").single();

    if (!error && createdGrn?.id) {
      const grnItemPayload = receivedItems.map((item) => ({
        grn_id: createdGrn.id,
        po_item_id: item.id,
        item_name_snapshot: item.name,
        quantity_received: item.received_qty,
        quantity_accepted: item.accepted_qty,
        quantity_rejected: item.rejected_qty,
      }));
      await supabase.from("grn_items").insert(grnItemPayload);

      const isPartiallyReceived = receivedItems.some(i => i.received_qty < i.ordered_qty);
      const newStatus = isPartiallyReceived ? "partially_received" : "fully_received";

      // Update PO status based on new workflow
      await supabase
        .from("purchase_orders")
        .update({ status: newStatus })
        .eq("id", selectedPO.id);
    }

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
            <TextField
              select
              fullWidth
              label="Select PO Number"
              margin="normal"
              required
              value={poId}
              onChange={(e) => handlePoSelect(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            >
              {purchaseOrders.map((po) => (
                <MenuItem key={po.id} value={po.po_number}>
                  {po.po_number} ({po.status})
                </MenuItem>
              ))}
            </TextField>
            <TextField fullWidth label="GRN Number" margin="normal" required value={grnNumber} onChange={(e) => setGrnNumber(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <TextField fullWidth type="date" label="GRN Date" margin="normal" required InputLabelProps={{ shrink: true }} value={grnDate} onChange={(e) => setGrnDate(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />

            {selectedPO && (
              <Box mt={2}>
                <Typography fontWeight={700} mb={1}>Items Shipped for {selectedPO.po_number}</Typography>
                <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Ordered</TableCell>
                        <TableCell>Received Qty</TableCell>
                        <TableCell>Accepted Qty</TableCell>
                        <TableCell>Rejected Qty</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {receivedItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.ordered_qty}</TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              inputProps={{ min: 0 }}
                              value={item.received_qty}
                              onChange={(e) => handleItemQtyChange(item.id, "received_qty", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              inputProps={{ min: 0 }}
                              value={item.accepted_qty}
                              onChange={(e) => handleItemQtyChange(item.id, "accepted_qty", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              inputProps={{ min: 0 }}
                              value={item.rejected_qty}
                              onChange={(e) => handleItemQtyChange(item.id, "rejected_qty", e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

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