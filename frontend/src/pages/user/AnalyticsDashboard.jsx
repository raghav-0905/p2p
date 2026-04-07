import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Grid, AppBar, Toolbar, IconButton, CircularProgress, Divider
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area
} from "recharts";

const COLORS = ["#4f46e5", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoiceStatusData, setInvoiceStatusData] = useState([]);
  const [monthlyPOData, setMonthlyPOData] = useState([]);
  const [monthlyInvoiceData, setMonthlyInvoiceData] = useState([]);
  const [summaryCards, setSummaryCards] = useState({ totalSpend: 0, avgInvoice: 0, totalPOs: 0, totalGRNs: 0, grnFulfillment: 0 });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: orgUser } = await supabase.from("organization_users").select("org_id").eq("user_id", user.id).single();
      if (!orgUser) return;
      const orgId = orgUser.org_id;

      /* Invoices */
      const { data: invoices } = await supabase.from("invoices").select("id, status, total_amount, invoice_date, created_at").eq("org_id", orgId);
      const inv = invoices || [];

      /* Invoice status pie */
      const statusMap = {};
      inv.forEach(i => { statusMap[i.status] = (statusMap[i.status] || 0) + 1; });
      setInvoiceStatusData(Object.entries(statusMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })));

      /* Monthly invoice spend (line chart) */
      const monthlyInv = {};
      inv.forEach(i => {
        const d = new Date(i.invoice_date || i.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyInv[key] = (monthlyInv[key] || 0) + Number(i.total_amount || 0);
      });
      setMonthlyInvoiceData(
        Object.entries(monthlyInv).sort().slice(-12).map(([month, spend]) => ({ month, spend: Math.round(spend) }))
      );

      /* POs */
      const { data: pos } = await supabase.from("purchase_orders").select("id, status, po_date, created_at, total_amount").eq("org_id", orgId);
      const poArr = pos || [];

      /* Monthly PO bar */
      const monthlyPO = {};
      poArr.forEach(p => {
        const d = new Date(p.po_date || p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyPO[key] = (monthlyPO[key] || 0) + 1;
      });
      setMonthlyPOData(
        Object.entries(monthlyPO).sort().slice(-12).map(([month, count]) => ({ month, count }))
      );

      /* GRNs */
      const { data: grns } = await supabase.from("grns").select("id, po_id").eq("org_id", orgId);
      const grnArr = grns || [];

      /* Summary cards */
      const totalSpend = inv.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
      const avgInvoice = inv.length ? totalSpend / inv.length : 0;
      const uniquePOsWithGRN = new Set(grnArr.map(g => g.po_id)).size;
      const grnFulfillment = poArr.length ? Math.round((uniquePOsWithGRN / poArr.length) * 100) : 0;

      setSummaryCards({
        totalSpend: Math.round(totalSpend),
        avgInvoice: Math.round(avgInvoice),
        totalPOs: poArr.length,
        totalGRNs: grnArr.length,
        grnFulfillment,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f8fafc">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" bgcolor="#f8fafc">
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ background: "#fff", color: "#1e293b", borderBottom: "1px solid #e2e8f0" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate("/user")}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ ml: 2, fontWeight: 700, color: "#4f46e5" }}>Visual Analytics</Typography>
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
        <Typography variant="h4" fontWeight={800} mb={4} color="#0f172a">
          Analytics Overview
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          {[
            { label: "Total Spend", value: `₹${summaryCards.totalSpend.toLocaleString("en-IN")}`, bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
            { label: "Avg Invoice Value", value: `₹${summaryCards.avgInvoice.toLocaleString("en-IN")}`, bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
            { label: "Total Purchase Orders", value: summaryCards.totalPOs, bg: "#f5f3ff", border: "#ddd6fe", color: "#7c3aed" },
            { label: "Total GRNs", value: summaryCards.totalGRNs, bg: "#fefce8", border: "#fde68a", color: "#a16207" },
            { label: "GRN Fulfillment Rate", value: `${summaryCards.grnFulfillment}%`, bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
          ].map((c, i) => (
            <Grid item xs={6} md={2.4} key={i}>
              <Paper elevation={0} sx={{ p: 2.5, bgcolor: c.bg, borderRadius: 3, border: `1px solid ${c.border}`, textAlign: "center" }}>
                <Typography variant="body2" fontWeight={600} color={c.color}>{c.label}</Typography>
                <Typography variant="h5" fontWeight={800} color={c.color} mt={0.5}>{c.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={4}>
          {/* Pie Chart – Invoice Status */}
          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0" }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Invoice Status Breakdown</Typography>
              <Divider sx={{ mb: 2 }} />
              {invoiceStatusData.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>No invoice data yet.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={invoiceStatusData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {invoiceStatusData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          {/* Bar Chart – Monthly PO Trend */}
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0" }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Monthly PO Creation Trend</Typography>
              <Divider sx={{ mb: 2 }} />
              {monthlyPOData.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>No PO data yet.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyPOData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} name="POs Created" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          {/* Area Chart – Monthly Invoice Spend */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0" }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Monthly Invoice Spend Trend</Typography>
              <Divider sx={{ mb: 2 }} />
              {monthlyInvoiceData.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>No invoice spend data yet.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyInvoiceData}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                    <Area type="monotone" dataKey="spend" stroke="#4f46e5" fillOpacity={1} fill="url(#colorSpend)" name="Spend (₹)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
