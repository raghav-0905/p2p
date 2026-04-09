import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchVendorPurchaseOrders, fetchVendorGrns, fetchVendorGrnItems } from "../lib/vendorPo";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import InventoryIcon from "@mui/icons-material/Inventory";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { motion } from "framer-motion";

export default function GRNManagement() {
  const [loading, setLoading] = useState(true);
  const [grns, setGrns] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [grnItems, setGrnItems] = useState([]);
  const [itemLoading, setItemLoading] = useState(false);

  useEffect(() => {
    loadGrns();
  }, []);

  const loadGrns = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vendorList } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      const vendor = vendorList?.[0];
      if (!vendor) return;

      // 1. Fetch authorized POs
      const pos = await fetchVendorPurchaseOrders(user.id, vendor);
      const poIds = pos.map(p => p.id);

      // 2. Fetch GRNs for those POs
      const grnData = await fetchVendorGrns(poIds);
      setGrns(grnData);
    } catch (err) {
      console.error("Error loading GRNs:", err);
    } finally {
      setLoading(false);
    }
  };

  const openGrnDetails = async (grn) => {
    setSelectedGrn(grn);
    setGrnItems([]);
    setDetailOpen(true);
    setItemLoading(true);
    
    try {
      const items = await fetchVendorGrnItems(grn.id);
      setGrnItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setItemLoading(false);
    }
  };

  return (
    <Box>
      <Box mb={4} component={motion.div} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="h4" fontWeight={800} color="#1e293b" mb={1} display="flex" alignItems="center" gap={1}>
          <LocalShippingIcon fontSize="large" color="primary" />
          Goods Receipt Notes (GRNs)
        </Typography>
        <Typography color="text.secondary">
          Track inspection results and received quantities for your deliveries.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={6}>
            <CircularProgress />
          </Box>
        ) : grns.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography variant="body1" color="text.secondary" fontWeight={500}>
              No GRNs found. Deliveries for your POs will appear here once inspected by the buyer.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>GRN Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>GRN Number</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>PO Number</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grns.map((grn) => (
                  <TableRow key={grn.id} hover>
                    <TableCell>{grn.grn_date || new Date(grn.created_at).toISOString().split('T')[0]}</TableCell>
                    <TableCell><Typography fontWeight={600} color="primary">{grn.grn_number}</Typography></TableCell>
                    <TableCell>{grn.purchase_orders?.po_number || grn.po_id?.substring(0,8)}</TableCell>
                    <TableCell align="right">
                      <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<VisibilityIcon />}
                        onClick={() => openGrnDetails(grn)}
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

      {/* Details Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <InventoryIcon color="primary" />
          GRN: {selectedGrn?.grn_number}
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f8fafc" }}>
          
          <Box display="flex" justifyContent="space-between" mb={3} p={2} bgcolor="#fff" borderRadius={2} border="1px solid #e2e8f0">
            <Box>
              <Typography variant="caption" color="text.secondary">PO Number</Typography>
              <Typography variant="body2" fontWeight={600}>{selectedGrn?.purchase_orders?.po_number}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Date Received</Typography>
              <Typography variant="body2" fontWeight={600}>{selectedGrn?.grn_date}</Typography>
            </Box>
          </Box>

          <Typography variant="h6" mb={2} fontSize="1rem" fontWeight={600} color="#1e293b">Inspection Details</Typography>
          
          {itemLoading ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress size={30} /></Box>
          ) : grnItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No items found for this GRN.</Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell>Item Name</TableCell>
                    <TableCell align="right">Received</TableCell>
                    <TableCell align="right">Accepted</TableCell>
                    <TableCell align="right">Rejected</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grnItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_name_snapshot}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{item.quantity_received}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" label={item.quantity_accepted} color={item.quantity_accepted > 0 ? "success" : "default"} />
                      </TableCell>
                      <TableCell align="right">
                        <Chip size="small" label={item.quantity_rejected} color={item.quantity_rejected > 0 ? "error" : "default"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#fff" }}>
          <Button onClick={() => setDetailOpen(false)} variant="contained" disableElevation>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
