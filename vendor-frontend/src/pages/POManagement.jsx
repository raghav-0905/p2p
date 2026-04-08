import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchVendorPurchaseOrders, enrichPOsWithOrganizations } from "../lib/vendorPo";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, TextField, InputAdornment, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";

export default function POManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState([]);
  const [vendorData, setVendorData] = useState(null);
  const [pendingNotifications, setPendingNotifications] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  useEffect(() => {
    fetchPOs();

    // Setup realtime listener
    const channel = supabase.channel('vendor-pos-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => {
        fetchPOs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPOs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vendor } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (vendor) {
        setVendorData(vendor);
        const raw = await fetchVendorPurchaseOrders(user.id, vendor);
        const poData = await enrichPOsWithOrganizations(raw);
        setPos(poData);
        setPendingNotifications(
          poData.filter((po) => (po.status || "").toLowerCase() === "created").length
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (poId, newStatus) => {
    try {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: newStatus })
        .eq("id", poId);
      if (error) throw error;
      fetchPOs();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status = "") => {
    const s = status.toLowerCase();
    if (s === "approved" || s === "closed") return "success";
    if (s === "created") return "warning";
    if (s === "cancelled") return "error";
    return "default";
  };

  const filteredPOs = pos.filter(p => 
    (p.po_number || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.organizations?.legal_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#1e293b" mb={1}>Purchase Orders</Typography>
          <Typography color="text.secondary">
            Review, accept, or reject inbound purchase orders. Pending requests: {pendingNotifications}
          </Typography>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between" }}>
          <TextField
            size="small"
            placeholder="Search PO by ID or Buyer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
              }
            }}
            sx={{ width: 300 }}
          />
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Buyer</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center">No POs assigned yet.</TableCell></TableRow>
                ) : filteredPOs.map((po) => (
                  <TableRow key={po.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{po.po_number}</TableCell>
                    <TableCell>{new Date(po.po_date || po.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{po.organizations?.legal_name}</TableCell>
                    <TableCell>₹{Number(po.total_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={po.status || "Pending Receipt"} size="small" color={getStatusColor(po.status)} sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right">
                      {(po.status || "").toLowerCase() === "created" ? (
                        <Box display="flex" gap={1} justifyContent="flex-end">
                          <Button size="small" variant="contained" color="success" onClick={() => handleAction(po.id, "approved")}>Accept</Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => handleAction(po.id, "cancelled")}>Reject</Button>
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<VisibilityIcon />}
                          onClick={async () => {
                            const { data: items } = await supabase
                              .from("purchase_order_items")
                              .select("*")
                              .eq("po_id", po.id);
                            setSelectedPO({ ...po, items: items || [] });
                            setDetailOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>PO Details - {selectedPO?.po_number}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Buyer: {selectedPO?.organizations?.legal_name} | Status: {selectedPO?.status}
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Rate</TableCell>
                  <TableCell>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(selectedPO?.items || []).length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center">No line items found.</TableCell></TableRow>
                ) : (selectedPO?.items || []).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.item_name_snapshot}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>₹{Number(item.unit_price || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell>₹{Number(item.total_amount || 0).toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
