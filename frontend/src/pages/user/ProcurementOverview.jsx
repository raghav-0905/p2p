import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, AppBar, Toolbar, IconButton, CircularProgress,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { motion } from "framer-motion";

const STATUS_COLORS = {
  created: "info", approved: "success", closed: "default", cancelled: "error",
  submitted: "info", matched: "success", on_hold: "warning", paid: "success", rejected: "error",
  received: "success", partial: "warning",
};

export default function ProcurementOverview() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pos, setPOs] = useState([]);
  const [grns, setGRNs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [dispatchMap, setDispatchMap] = useState({});

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const ch = supabase
      .channel("procurement-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "grns" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: orgUser } = await supabase.from("organization_users").select("org_id").eq("user_id", user.id).single();
      if (!orgUser) return;
      const orgId = orgUser.org_id;

      const [poRes, grnRes, invRes] = await Promise.all([
        supabase.from("purchase_orders").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
        supabase.from("grns").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
        supabase.from("invoices").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      ]);

      if (poRes.data) setPOs(poRes.data);
      if (grnRes.data) setGRNs(grnRes.data);
      if (invRes.data) setInvoices(invRes.data);

      const { data: dispatchLogs } = await supabase
        .from("audit_logs")
        .select("entity_id, performed_at, metadata")
        .eq("org_id", orgId)
        .eq("entity_type", "purchase_order")
        .eq("action", "dispatch_update")
        .order("performed_at", { ascending: false });
      const map = {};
      (dispatchLogs || []).forEach((d) => {
        if (!map[d.entity_id]) map[d.entity_id] = d;
      });
      setDispatchMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const updateInvoiceStatus = async (id, status) => {
    await supabase.from("invoices").update({ status }).eq("id", id);
    fetchAll();
  };

  return (
    <Box minHeight="100vh" bgcolor="#f8fafc">
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ background: "#fff", color: "#1e293b", borderBottom: "1px solid #e2e8f0" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate("/user")}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ ml: 2, fontWeight: 700, color: "#4f46e5" }}>Procurement Overview</Typography>
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
        <Typography variant="h4" fontWeight={800} mb={3} color="#0f172a">
          All Procurement Records
        </Typography>

        <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ borderBottom: "1px solid #e2e8f0", px: 2, pt: 1 }}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label={`Purchase Orders (${pos.length})`} sx={{ fontWeight: 600, textTransform: "none" }} />
            <Tab label={`Goods Receipts (${grns.length})`} sx={{ fontWeight: 600, textTransform: "none" }} />
            <Tab label={`Invoices (${invoices.length})`} sx={{ fontWeight: 600, textTransform: "none" }} />
          </Tabs>

          {loading ? (
            <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
          ) : (
            <Box>
              {/* PO Tab */}
              {tab === 0 && (
                pos.length === 0 ? (
                  <Typography color="text.secondary" p={4} textAlign="center">No purchase orders yet.</Typography>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>PO Number</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>GSTIN</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Dispatch Update</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pos.map(po => (
                          <TableRow key={po.id} hover>
                            <TableCell><Typography fontWeight={600}>{po.po_number}</Typography></TableCell>
                            <TableCell>{po.po_date ? new Date(po.po_date).toLocaleDateString() : "—"}</TableCell>
                            <TableCell>{po.supplier_name}</TableCell>
                            <TableCell>{po.supplier_gstin || "—"}</TableCell>
                            <TableCell>₹{Number(po.total_amount || 0).toLocaleString("en-IN")}</TableCell>
                            <TableCell><Chip size="small" label={po.status} color={STATUS_COLORS[po.status] || "default"} /></TableCell>
                            <TableCell>
                              {dispatchMap[po.id]
                                ? `Tracking: ${dispatchMap[po.id]?.metadata?.tracking_id || "updated"}`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              )}

              {/* GRN Tab */}
              {tab === 1 && (
                grns.length === 0 ? (
                  <Typography color="text.secondary" p={4} textAlign="center">No goods receipts yet.</Typography>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>GRN Number</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>PO ID</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {grns.map(grn => (
                          <TableRow key={grn.id} hover>
                            <TableCell><Typography fontWeight={600}>{grn.grn_number}</Typography></TableCell>
                            <TableCell>{grn.grn_date ? new Date(grn.grn_date).toLocaleDateString() : "—"}</TableCell>
                            <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{grn.po_id}</TableCell>
                            <TableCell><Chip size="small" label={grn.status} color={STATUS_COLORS[grn.status] || "default"} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              )}

              {/* Invoice Tab */}
              {tab === 2 && (
                invoices.length === 0 ? (
                  <Typography color="text.secondary" p={4} textAlign="center">No invoices yet.</Typography>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>GSTIN</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoices.map(inv => (
                          <TableRow key={inv.id} hover>
                            <TableCell><Typography fontWeight={600}>{inv.invoice_number}</Typography></TableCell>
                            <TableCell>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "—"}</TableCell>
                            <TableCell>{inv.supplier_name}</TableCell>
                            <TableCell>{inv.supplier_gstin || "—"}</TableCell>
                            <TableCell>₹{Number(inv.total_amount || 0).toLocaleString("en-IN")}</TableCell>
                            <TableCell><Chip size="small" label={inv.status} color={STATUS_COLORS[inv.status] || "default"} /></TableCell>
                            <TableCell>
                              {inv.status === "submitted" ? (
                                <Box display="flex" gap={1}>
                                  <Chip label="Accept" color="success" size="small" onClick={() => updateInvoiceStatus(inv.id, "matched")} />
                                  <Chip label="Reject" color="error" size="small" onClick={() => updateInvoiceStatus(inv.id, "rejected")} />
                                </Box>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
