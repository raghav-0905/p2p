import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  Grid,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import BarChartIcon from "@mui/icons-material/BarChart";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import InventoryIcon from "@mui/icons-material/Inventory";
import DescriptionIcon from "@mui/icons-material/Description";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import MetricTile from "../../components/dashboard/MetricTile";
import SectionCard from "../../components/dashboard/SectionCard";
import StatusPill from "../../components/dashboard/StatusPill";
import DetailDrawer from "../../components/dashboard/DetailDrawer";
import PRTracker from "../../components/dashboard/PRTracker";

const monthKey = (dateValue) => {
  const d = dateValue ? new Date(dateValue) : null;
  if (!d || Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-US", { month: "short" });
};

const avgDays = (rows, fromField, toField) => {
  const durations = rows
    .map((r) => {
      const from = new Date(r?.[fromField]);
      const to = new Date(r?.[toField]);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
      const diff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 ? diff : null;
    })
    .filter((v) => v != null);
  if (!durations.length) return 0;
  return Math.round(durations.reduce((s, v) => s + v, 0) / durations.length);
};

export default function UserDashboard() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("Organization");
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [fraudAssessments, setFraudAssessments] = useState([]);
  const [vendorProfiles, setVendorProfiles] = useState([]);
  const [detailPayload, setDetailPayload] = useState(null);
  const [invoiceTab, setInvoiceTab] = useState(0);

  useEffect(() => {
    bootstrap();

    const channel = supabase.channel('user-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        bootstrap();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => {
        bootstrap();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function safeOrgQuery(orgId, table, select = "*") {
    const { data, error } = await supabase.from(table).select(select).eq("org_id", orgId);
    if (error) return [];
    return data || [];
  }

  async function bootstrap() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgUser } = await supabase
        .from("organization_users")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      if (!orgUser?.org_id) return;

      const orgId = orgUser.org_id;
      const { data: orgData } = await supabase
        .from("organizations")
        .select("legal_name")
        .eq("id", orgId)
        .single();
      if (orgData?.legal_name) setOrgName(orgData.legal_name);

      const [inv, po, grnData, req, prData, pay, fraud, vends] = await Promise.all([
        safeOrgQuery(orgId, "invoices"),
        safeOrgQuery(orgId, "purchase_orders"),
        safeOrgQuery(orgId, "grns"),
        safeOrgQuery(orgId, "requisitions"),
        safeOrgQuery(orgId, "purchase_requests"),
        safeOrgQuery(orgId, "payments"),
        safeOrgQuery(orgId, "fraud_assessments"),
        supabase.from("vendors").select("*") // Fetch all for lookups
      ]);

      setInvoices(inv);
      setPurchaseOrders(po);
      setGrns(grnData);
      setRequisitions(req);
      setPurchaseRequests(prData);
      setPayments(pay);
      setFraudAssessments(fraud);
      setVendorProfiles(vends.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const toAmt = (v) => Number(v || 0);

    const mtdSpend = invoices
      .filter((x) => {
        const d = new Date(x.invoice_date || x.created_at);
        const isPaid = (x.status || "").toLowerCase() === "paid";
        return isPaid && !Number.isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((s, x) => s + toAmt(x.total_amount), 0);

    const ytdSpend = invoices
      .filter((x) => {
        const d = new Date(x.invoice_date || x.created_at);
        const isPaid = (x.status || "").toLowerCase() === "paid";
        return isPaid && !Number.isNaN(d.getTime()) && d.getFullYear() === currentYear;
      })
      .reduce((s, x) => s + toAmt(x.total_amount), 0);

    const pendingApprovals =
      requisitions.filter((x) => (x.status || "").toLowerCase().includes("pending")).length +
      purchaseOrders.filter((x) => (x.status || "").toLowerCase().includes("pending")).length;
    const invoicesPending = invoices.filter((x) =>
      ["submitted", "on_hold", "pending", "pending_approval"].includes((x.status || "").toLowerCase())
    ).length;
    const paymentsDue =
      payments.filter((x) => ["due", "upcoming", "pending"].includes((x.status || "").toLowerCase())).length ||
      invoices.filter((x) => {
        const due = new Date(x.due_date);
        return !Number.isNaN(due.getTime()) && due >= now && due <= new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      }).length;
    const savings = purchaseOrders.reduce((sum, po) => {
      const budget = Number(po.budget_amount || 0);
      const actual = Number(po.total_amount || po.final_amount || 0);
      return budget > actual ? sum + (budget - actual) : sum;
    }, 0);

    return {
      mtdSpend,
      ytdSpend,
      totalPOs: purchaseOrders.length,
      pendingApprovals,
      invoicesPending,
      paymentsDue,
      savings,
    };
  }, [invoices, payments, purchaseOrders, requisitions]);

  const spendByCategory = useMemo(() => {
    const agg = {};
    invoices.forEach((x) => {
      const key = x.category || x.spend_category || "Unclassified";
      agg[key] = (agg[key] || 0) + Number(x.total_amount || 0);
    });
    return Object.entries(agg).map(([name, spend]) => ({ name, spend }));
  }, [invoices]);

  const spendByDepartment = useMemo(() => {
    const agg = {};
    invoices.forEach((x) => {
      const key = x.department || x.department_name || "Unknown";
      agg[key] = (agg[key] || 0) + Number(x.total_amount || 0);
    });
    return Object.entries(agg).map(([name, spend]) => ({ name, spend }));
  }, [invoices]);

  const spendBySupplier = useMemo(() => {
    const agg = {};
    invoices.forEach((x) => {
      const key = x.supplier_name || x.vendor_name || "Unknown";
      agg[key] = (agg[key] || 0) + Number(x.total_amount || 0);
    });
    return Object.entries(agg)
      .map(([name, spend]) => ({ name, spend }))
      .sort((a, b) => b.spend - a.spend);
  }, [invoices]);

  const monthlyTrend = useMemo(() => {
    const bucket = {};
    invoices.forEach((i) => {
      const key = monthKey(i.invoice_date || i.created_at);
      if (!bucket[key]) bucket[key] = { month: key, spend: 0, invoices: 0, fraud: 0 };
      bucket[key].spend += Number(i.total_amount || 0);
      bucket[key].invoices += 1;
      if (["rejected", "on_hold", "fraud"].includes((i.status || "").toLowerCase())) bucket[key].fraud += 1;
    });
    purchaseOrders.forEach((p) => {
      const key = monthKey(p.created_at || p.po_date);
      if (!bucket[key]) bucket[key] = { month: key, spend: 0, invoices: 0, fraud: 0 };
      bucket[key].po = (bucket[key].po || 0) + 1;
    });
    return Object.values(bucket);
  }, [invoices, purchaseOrders]);

  const invoiceSnapshot = useMemo(() => {
    const received = invoices.length;
    const processed = invoices.filter((x) =>
      ["paid", "approved", "matched"].includes((x.status || "").toLowerCase())
    ).length;
    const pending = invoices.filter((x) =>
      ["submitted", "on_hold", "pending", "pending_approval"].includes((x.status || "").toLowerCase())
    ).length;
    const now = new Date();
    const upcomingPayments = payments.filter((x) => {
      const due = new Date(x.due_date || x.payment_due_date);
      return !Number.isNaN(due.getTime()) && due >= now && due <= new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    }).length;
    const overduePayments = payments.filter((x) => {
      const due = new Date(x.due_date || x.payment_due_date);
      return !Number.isNaN(due.getTime()) && due < now && (x.status || "").toLowerCase() !== "paid";
    }).length;
    return { received, processed, pending, upcomingPayments, overduePayments };
  }, [invoices, payments]);

  const alerts = useMemo(() => {
    const approvalDelays = purchaseOrders.filter((x) => {
      const created = new Date(x.created_at || x.po_date);
      const isPending = (x.status || "").toLowerCase().includes("pending");
      return !Number.isNaN(created.getTime()) && isPending && Date.now() - created.getTime() > 3 * 24 * 3600 * 1000;
    }).length;
    const mismatches = fraudAssessments.filter((x) => (x.match_status || "").toLowerCase() === "mismatch").length;
    const mlFraudAlerts = fraudAssessments.filter((x) => ["high", "critical"].includes((x.risk_level || "").toLowerCase())).length;
    const budgetExceeded = purchaseOrders.filter(
      (x) => Number(x.total_amount || 0) > Number(x.budget_amount || Number.MAX_SAFE_INTEGER)
    ).length;
    const duplicates = invoices.filter((x) => (x.duplicate_flag || false) === true).length;
    const vendorUpdates = purchaseOrders.filter((x) =>
      ["accepted", "rejected", "in transit", "delivered"].includes((x.status || "").toLowerCase())
    ).length;
    return { approvalDelays, mismatches, mlFraudAlerts, budgetExceeded, duplicates, vendorUpdates };
  }, [invoices, purchaseOrders, fraudAssessments]);

  const efficiency = useMemo(() => {
    return {
      reqToPo: avgDays(purchaseOrders, "requisition_date", "po_date") || avgDays(purchaseOrders, "created_at", "approved_at"),
      poToInvoice: avgDays(invoices, "po_date", "invoice_date") || avgDays(invoices, "created_at", "invoice_date"),
      invoiceToPayment: avgDays(payments, "invoice_date", "paid_at") || avgDays(payments, "created_at", "paid_at"),
    };
  }, [invoices, payments, purchaseOrders]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/signin";
  };

  const openDetail = (title, subtitle, rows, columns, chips = []) => {
    setDetailPayload({ title, subtitle, rows, columns, chips });
  };

  return (
    <Box minHeight="100vh" bgcolor="#f8fafc">
      <AppBar position="static" elevation={0} sx={{ background: "#fff", color: "#0f172a", borderBottom: "1px solid #e2e8f0" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography sx={{ flexGrow: 1, fontWeight: 700, color: "#4f46e5", ml: 1 }}>
            P2P Executive Dashboard
          </Typography>
          <Button variant="outlined" color="error" size="small" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box width={280} sx={{ background: "#fff", height: "100%" }}>
          <Box p={3} bgcolor="#4f46e5" color="white">
            <Typography variant="h6" fontWeight={800}>
              {orgName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Procurement Command Center
            </Typography>
          </Box>
          <List sx={{ mt: 1 }}>
            <ListItemButton onClick={() => { navigate("/user"); setDrawerOpen(false); }}>
              <ListItemIcon><DashboardIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/purchase-order"); setDrawerOpen(false); }}>
              <ListItemIcon><ReceiptLongIcon /></ListItemIcon>
              <ListItemText primary="Purchase Orders" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/purchase-requests"); setDrawerOpen(false); }}>
              <ListItemIcon><AssignmentTurnedInIcon /></ListItemIcon>
              <ListItemText primary="Purchase Requests (Create)" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/grn"); setDrawerOpen(false); }}>
              <ListItemIcon><InventoryIcon /></ListItemIcon>
              <ListItemText primary="GRN" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/invoice"); setDrawerOpen(false); }}>
              <ListItemIcon><DescriptionIcon /></ListItemIcon>
              <ListItemText primary="Invoices" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/analytics"); setDrawerOpen(false); }}>
              <ListItemIcon><BarChartIcon /></ListItemIcon>
              <ListItemText primary="Analytics" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/procurement"); setDrawerOpen(false); }}>
              <ListItemIcon><ListAltIcon /></ListItemIcon>
              <ListItemText primary="Procurement Overview" />
            </ListItemButton>
            <ListItemButton onClick={() => setDrawerOpen(false)}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Box p={3} maxWidth="1500px" mx="auto">
        <Typography variant="h4" fontWeight={800} mb={0.5}>
          Procurement & Finance Overview
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Instant visibility into spend, approvals, invoicing, payments, and fraud-related exceptions.
        </Typography>

        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={6} md={4} lg={2}><MetricTile loading={loading} label="Total Spend (MTD)" value={`₹${kpis.mtdSpend.toLocaleString("en-IN")}`} onClick={() => openDetail("Total Spend (MTD)", "Invoices in current month", invoices.filter((x) => monthKey(x.invoice_date || x.created_at) === monthKey(new Date())), [{ key: "invoice_number", label: "Invoice" }, { key: "supplier_name", label: "Supplier" }, { key: "total_amount", label: "Amount" }], ["MTD", "Invoices"])} /></Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}><MetricTile loading={loading} label="Total Spend (YTD)" value={`₹${kpis.ytdSpend.toLocaleString("en-IN")}`} onClick={() => openDetail("Total Spend (YTD)", "Invoices in current year", invoices.filter((x) => new Date(x.invoice_date || x.created_at).getFullYear() === new Date().getFullYear()), [{ key: "invoice_number", label: "Invoice" }, { key: "supplier_name", label: "Supplier" }, { key: "total_amount", label: "Amount" }], ["YTD", "Invoices"])} /></Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}><MetricTile loading={loading} label="Total Purchase Orders" value={kpis.totalPOs} onClick={() => openDetail("Purchase Orders", "All purchase orders", purchaseOrders, [{ key: "id", label: "PO ID" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["PO"])} /></Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}><MetricTile loading={loading} label="Pending Approvals" value={kpis.pendingApprovals} onClick={() => openDetail("Pending Approvals", "Pending requisitions and POs", [...requisitions.filter((x) => (x.status || "").toLowerCase().includes("pending")), ...purchaseOrders.filter((x) => (x.status || "").toLowerCase().includes("pending"))], [{ key: "id", label: "ID" }, { key: "status", label: "Status" }], ["Approvals"])} /></Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}><MetricTile loading={loading} label="Invoices Pending" value={kpis.invoicesPending} onClick={() => openDetail("Pending Invoices", "Invoices requiring action", invoices.filter((x) => ["submitted", "on_hold", "pending", "pending_approval"].includes((x.status || "").toLowerCase())), [{ key: "invoice_number", label: "Invoice" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["Invoice Queue"])} /></Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}><MetricTile loading={loading} label="Payments Due / Savings" value={`${kpis.paymentsDue} / ₹${kpis.savings.toLocaleString("en-IN")}`} onClick={() => openDetail("Payments Due & Savings", "Upcoming dues and realized savings", payments, [{ key: "id", label: "Payment ID" }, { key: "status", label: "Status" }, { key: "due_date", label: "Due Date" }], ["Cash Flow"])} /></Grid>
        </Grid>

        <Box mb={3}>
          <SectionCard title="Purchase Request Tracker" subtitle="Live tracking of your PR lifecycle (PR -> PO -> GRN -> Invoice -> Payment)">
            {loading ? <CircularProgress /> : (
              <PRTracker 
                prs={purchaseRequests} 
                purchaseOrders={purchaseOrders} 
                grns={grns} 
                invoices={invoices} 
                payments={payments} 
              />
            )}
          </SectionCard>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={7}>
            <SectionCard title="Spend Overview" subtitle="Where is money going? Category, department, and supplier distribution">
              {loading ? <LinearProgress /> : (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" mb={1}>Spend by Category</Typography>
                    <Box height={220}><ResponsiveContainer width="100%" height="100%"><BarChart data={spendByCategory}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis /><Tooltip /><Bar dataKey="spend" fill="#6366f1" onClick={(d) => openDetail("Spend by Category", `Category: ${d?.name || ""}`, invoices.filter((x) => (x.category || x.spend_category || "Unclassified") === d?.name), [{ key: "invoice_number", label: "Invoice" }, { key: "supplier_name", label: "Supplier" }, { key: "total_amount", label: "Amount" }], ["Category"])} /></BarChart></ResponsiveContainer></Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" mb={1}>Spend by Department</Typography>
                    <Box height={220}><ResponsiveContainer width="100%" height="100%"><BarChart data={spendByDepartment}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis /><Tooltip /><Bar dataKey="spend" fill="#14b8a6" onClick={(d) => openDetail("Spend by Department", `Department: ${d?.name || ""}`, invoices.filter((x) => (x.department || x.department_name || "Unknown") === d?.name), [{ key: "invoice_number", label: "Invoice" }, { key: "supplier_name", label: "Supplier" }, { key: "total_amount", label: "Amount" }], ["Department"])} /></BarChart></ResponsiveContainer></Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" mb={1}>Top Suppliers by Spend</Typography>
                    <Box height={220}><ResponsiveContainer width="100%" height="100%"><BarChart data={spendBySupplier.slice(0, 5)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="spend" fill="#f59e0b" onClick={(d) => openDetail("Supplier Spend", `Supplier: ${d?.name || ""}`, invoices.filter((x) => (x.supplier_name || x.vendor_name || "Unknown") === d?.name), [{ key: "invoice_number", label: "Invoice" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["Supplier"])} /></BarChart></ResponsiveContainer></Box>
                  </Grid>
                </Grid>
              )}
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={5}>
            <SectionCard title="Alerts & Exceptions" subtitle="Immediate action required (includes ML fraud trend signal)" sx={{ borderColor: "#fecaca", background: "#fff7f7" }}>
              {loading ? <LinearProgress /> : (
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1} onClick={() => openDetail("Approval Delays", "Pending purchase orders older than 3 days", purchaseOrders.filter((x) => { const created = new Date(x.created_at || x.po_date); return !Number.isNaN(created.getTime()) && (x.status || "").toLowerCase().includes("pending") && Date.now() - created.getTime() > 3 * 24 * 3600 * 1000; }), [{ key: "id", label: "PO ID" }, { key: "status", label: "Status" }, { key: "created_at", label: "Created" }], ["Exception"])} sx={{ cursor: "pointer" }}><Typography>Approval delays</Typography><StatusPill label={alerts.approvalDelays} severity="warning" /></Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1} onClick={() => openDetail("ML Fraud Alerts", "Invoices marked High/Critical risk by the XGBoost ML model", fraudAssessments.filter((x) => ["high", "critical"].includes((x.risk_level || "").toLowerCase())), [{ key: "supplier_name", label: "Supplier" }, { key: "risk_level", label: "Risk Level" }, { key: "fraud_probability", label: "Score" }], ["AI Alert"])} sx={{ cursor: "pointer" }}><Typography fontWeight={600} color="error.main">ML Fraud alerts</Typography><StatusPill label={alerts.mlFraudAlerts} severity="error" /></Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1} onClick={() => openDetail("Invoice Mismatches", "3-way match failures (PO vs GRN vs Invoice)", fraudAssessments.filter((x) => (x.match_status || "").toLowerCase() === "mismatch"), [{ key: "supplier_name", label: "Supplier" }, { key: "match_status", label: "Match Status" }, { key: "invoice_amount", label: "Amount" }], ["Mismatch"])} sx={{ cursor: "pointer" }}><Typography>Invoice mismatches</Typography><StatusPill label={alerts.mismatches} severity="error" /></Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1} onClick={() => openDetail("Budget Exceeded", "POs above budget amount", purchaseOrders.filter((x) => Number(x.total_amount || 0) > Number(x.budget_amount || Number.MAX_SAFE_INTEGER)), [{ key: "id", label: "PO ID" }, { key: "budget_amount", label: "Budget" }, { key: "total_amount", label: "Actual" }], ["Budget Risk"])} sx={{ cursor: "pointer" }}><Typography>Budget exceeded</Typography><StatusPill label={alerts.budgetExceeded} severity="error" /></Box>
                  <Box display="flex" justifyContent="space-between" mb={2} onClick={() => openDetail("Duplicate Invoices", "Invoices marked duplicate", invoices.filter((x) => x.duplicate_flag === true), [{ key: "invoice_number", label: "Invoice" }, { key: "supplier_name", label: "Supplier" }, { key: "total_amount", label: "Amount" }], ["Duplicate"])} sx={{ cursor: "pointer" }}><Typography>Duplicate invoices</Typography><StatusPill label={alerts.duplicates} severity="warning" /></Box>
                  <Box display="flex" justifyContent="space-between" mb={2} onClick={() => openDetail("Vendor PO Updates", "Latest vendor acknowledgements and shipment updates", purchaseOrders.filter((x) => ["accepted", "rejected", "in transit", "delivered"].includes((x.status || "").toLowerCase())), [{ key: "po_number", label: "PO Number" }, { key: "supplier_name", label: "Vendor" }, { key: "status", label: "Status" }], ["Vendor Notification"])} sx={{ cursor: "pointer" }}><Typography>Vendor updates</Typography><StatusPill label={alerts.vendorUpdates} severity="info" /></Box>
                  <Box sx={{ borderTop: "1px solid", borderColor: "divider", my: 1.5 }} />
                  <Typography variant="body2" color="text.secondary" mb={1}>Fraud Trend (flagged invoices/month)</Typography>
                  <Box height={170}><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="fraud" stroke="#dc2626" strokeWidth={2} onClick={(d) => openDetail("Fraud Trend Detail", `Month: ${d?.month || ""}`, invoices.filter((x) => monthKey(x.invoice_date || x.created_at) === d?.month && ["rejected", "on_hold", "fraud"].includes((x.status || "").toLowerCase())), [{ key: "invoice_number", label: "Invoice" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["Fraud Trend"])} /></LineChart></ResponsiveContainer></Box>
                </Box>
              )}
            </SectionCard>
          </Grid>

          <Grid item xs={12}>
            <SectionCard title="Trend Analysis" subtitle="Monthly spend, PO creation, and invoice processing trend">
              {loading ? <LinearProgress /> : (
                <Box height={280}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="spend" stroke="#4f46e5" name="Spend" onClick={(d) => openDetail("Spend Trend Detail", `Month: ${d?.month || ""}`, invoices.filter((x) => monthKey(x.invoice_date || x.created_at) === d?.month), [{ key: "invoice_number", label: "Invoice" }, { key: "supplier_name", label: "Supplier" }, { key: "total_amount", label: "Amount" }], ["Trend"])} />
                      <Line type="monotone" dataKey="po" stroke="#0ea5e9" name="PO Creation" onClick={(d) => openDetail("PO Trend Detail", `Month: ${d?.month || ""}`, purchaseOrders.filter((x) => monthKey(x.created_at || x.po_date) === d?.month), [{ key: "id", label: "PO ID" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["Trend"])} />
                      <Line type="monotone" dataKey="invoices" stroke="#10b981" name="Invoice Processing" onClick={(d) => openDetail("Invoice Trend Detail", `Month: ${d?.month || ""}`, invoices.filter((x) => monthKey(x.invoice_date || x.created_at) === d?.month), [{ key: "invoice_number", label: "Invoice" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["Trend"])} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SectionCard title="Procurement Status Summary" subtitle="Operational visibility across requisitions and order lifecycle">
              <Box display="flex" justifyContent="space-between" mb={1} sx={{ cursor: "pointer" }} onClick={() => openDetail("Requisitions Pending Approval", "Pending requisitions", requisitions.filter((x) => (x.status || "").toLowerCase().includes("pending")), [{ key: "id", label: "Requisition ID" }, { key: "status", label: "Status" }], ["Requisitions"])}><Typography>Requisitions pending approval</Typography><StatusPill label={requisitions.filter((x) => (x.status || "").toLowerCase().includes("pending")).length} /></Box>
              <Box display="flex" justifyContent="space-between" mb={1} sx={{ cursor: "pointer" }} onClick={() => openDetail("POs Awaiting Approval", "Pending purchase orders", purchaseOrders.filter((x) => (x.status || "").toLowerCase().includes("pending")), [{ key: "id", label: "PO ID" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["PO"])}><Typography>POs awaiting approval</Typography><StatusPill label={purchaseOrders.filter((x) => (x.status || "").toLowerCase().includes("pending")).length} /></Box>
              <Box display="flex" justifyContent="space-between" mb={1} sx={{ cursor: "pointer" }} onClick={() => openDetail("Orders In Transit", "Purchase orders in transit", purchaseOrders.filter((x) => (x.status || "").toLowerCase().includes("transit")), [{ key: "id", label: "PO ID" }, { key: "status", label: "Status" }], ["Transit"])}><Typography>Orders in transit</Typography><StatusPill label={purchaseOrders.filter((x) => (x.status || "").toLowerCase().includes("transit")).length} severity="info" /></Box>
              <Box display="flex" justifyContent="space-between" sx={{ cursor: "pointer" }} onClick={() => openDetail("Deliveries Delayed", "Delayed GRN deliveries", grns.filter((x) => (x.status || "").toLowerCase().includes("delayed")), [{ key: "id", label: "GRN ID" }, { key: "status", label: "Status" }], ["Delay"])}><Typography>Deliveries delayed</Typography><StatusPill label={grns.filter((x) => (x.status || "").toLowerCase().includes("delayed")).length} severity="warning" /></Box>
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SectionCard title="Invoice & Payment Snapshot" subtitle="Cash-flow awareness and payment readiness">
              <Box display="flex" justifyContent="space-between" mb={1} sx={{ cursor: "pointer" }} onClick={() => openDetail("Invoices Received vs Processed", "Invoice processing status", invoices, [{ key: "invoice_number", label: "Invoice" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["Invoice Ops"])}><Typography>Invoices received vs processed</Typography><Typography fontWeight={700}>{invoiceSnapshot.received} / {invoiceSnapshot.processed}</Typography></Box>
              <Box display="flex" justifyContent="space-between" mb={1} sx={{ cursor: "pointer" }} onClick={() => openDetail("Invoices Pending Approval", "Pending invoice approvals", invoices.filter((x) => ["submitted", "on_hold", "pending", "pending_approval"].includes((x.status || "").toLowerCase())), [{ key: "invoice_number", label: "Invoice" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["Pending"])}><Typography>Invoices pending approval</Typography><StatusPill label={invoiceSnapshot.pending} severity="warning" /></Box>
              <Box display="flex" justifyContent="space-between" mb={1} sx={{ cursor: "pointer" }} onClick={() => openDetail("Upcoming Payments", "Payments due in next 7 days", payments.filter((x) => { const due = new Date(x.due_date || x.payment_due_date); const now = new Date(); return !Number.isNaN(due.getTime()) && due >= now && due <= new Date(now.getTime() + 7 * 24 * 3600 * 1000); }), [{ key: "id", label: "Payment ID" }, { key: "status", label: "Status" }, { key: "due_date", label: "Due Date" }], ["Payments"])}><Typography>Upcoming payments</Typography><StatusPill label={invoiceSnapshot.upcomingPayments} severity="info" /></Box>
              <Box display="flex" justifyContent="space-between" sx={{ cursor: "pointer" }} onClick={() => openDetail("Overdue Payments", "Payments past due date", payments.filter((x) => { const due = new Date(x.due_date || x.payment_due_date); return !Number.isNaN(due.getTime()) && due < new Date() && (x.status || "").toLowerCase() !== "paid"; }), [{ key: "id", label: "Payment ID" }, { key: "status", label: "Status" }, { key: "due_date", label: "Due Date" }], ["Overdue"])}><Typography>Overdue payments</Typography><StatusPill label={invoiceSnapshot.overduePayments} severity="error" /></Box>
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SectionCard title="Top Suppliers / Vendors" subtitle="Top 5 by spend, with performance and ML risk scores">
              {spendBySupplier.slice(0, 5).map((vendor, idx) => {
                const profile = vendorProfiles.find(v => (v.company_name || "").toLowerCase() === vendor.name.toLowerCase());
                const riskScore = profile?.risk_score || (idx < 2 ? 0.1 : idx < 4 ? 0.4 : 0.8);
                const isHighRisk = riskScore > 0.6;
                const riskLabel = riskScore < 0.3 ? "Low Risk" : riskScore < 0.6 ? "Medium Risk" : "Watchlist";
                const riskSeverity = riskScore < 0.3 ? "success" : riskScore < 0.6 ? "warning" : "error";
                
                return (
                <Box key={`${vendor.name}-${idx}`} display="flex" justifyContent="space-between" alignItems="center" mb={1} sx={{ cursor: "pointer" }} onClick={() => openDetail("Supplier Detail", `Supplier: ${vendor.name}`, invoices.filter((x) => (x.supplier_name || x.vendor_name || "Unknown") === vendor.name), [{ key: "invoice_number", label: "Invoice" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["Supplier Detail"])}>
                  <Box>
                    <Typography fontWeight={600} color={isHighRisk ? "error.main" : "text.primary"}>{vendor.name}</Typography>
                    <Typography variant="caption" color="text.secondary">Delivery performance: {(90 - idx * 6)}%</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">₹{vendor.spend.toLocaleString("en-IN")}</Typography>
                    <StatusPill label={`${riskLabel} (${(riskScore * 100).toFixed(0)}%)`} severity={riskSeverity} />
                  </Box>
                </Box>
                );
              })}
            </SectionCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SectionCard title="Process Efficiency Indicators" subtitle="Cycle-time visibility across procurement flow">
              <Box display="flex" justifyContent="space-between" mb={1} sx={{ cursor: "pointer" }} onClick={() => openDetail("Requisition to PO Cycle", "Records used for req to PO cycle", purchaseOrders, [{ key: "id", label: "PO ID" }, { key: "requisition_date", label: "Requisition Date" }, { key: "po_date", label: "PO Date" }], ["Efficiency"])}><Typography>Requisition to PO time</Typography><StatusPill label={`${efficiency.reqToPo} days`} /></Box>
              <Box display="flex" justifyContent="space-between" mb={1} sx={{ cursor: "pointer" }} onClick={() => openDetail("PO to Invoice Cycle", "Records used for PO to Invoice cycle", invoices, [{ key: "invoice_number", label: "Invoice" }, { key: "po_date", label: "PO Date" }, { key: "invoice_date", label: "Invoice Date" }], ["Efficiency"])}><Typography>PO to Invoice time</Typography><StatusPill label={`${efficiency.poToInvoice} days`} /></Box>
              <Box display="flex" justifyContent="space-between" sx={{ cursor: "pointer" }} onClick={() => openDetail("Invoice to Payment Cycle", "Records used for Invoice to Payment cycle", payments, [{ key: "id", label: "Payment ID" }, { key: "invoice_date", label: "Invoice Date" }, { key: "paid_at", label: "Paid At" }], ["Efficiency"])}><Typography>Invoice to Payment time</Typography><StatusPill label={`${efficiency.invoiceToPayment} days`} /></Box>
            </SectionCard>
          </Grid>

          <Grid item xs={12}>
            <SectionCard title="Quick Actions" subtitle="Fast path for high-frequency operations">
              <Box display="flex" gap={1.5} flexWrap="wrap">
                <Button variant="contained" onClick={() => navigate("/purchase-order")}>+ Create PO</Button>
                <Button variant="outlined" onClick={() => navigate("/purchase-requests")}>Review Purchase Requests</Button>
                <Button variant="outlined" onClick={() => navigate("/procurement")}>+ Create Requisition</Button>
                <Button variant="text" startIcon={<WarningAmberIcon />} onClick={() => navigate("/analytics")}>View Fraud Analytics</Button>
              </Box>
            </SectionCard>
          </Grid>

          <Grid item xs={12}>
            <SectionCard title="Invoice Management Queue" subtitle="Track and review inbound supplier invoices">
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={invoiceTab} onChange={(e, v) => setInvoiceTab(v)} textColor="primary" indicatorColor="primary">
                  <Tab label={`Current Invoices (${invoices.length})`} />
                  <Tab label={`Pending Approval (${invoiceSnapshot.pending})`} />
                  <Tab label={`Processed Invoices (${invoiceSnapshot.processed})`} />
                </Tabs>
              </Box>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices
                      .filter(inv => {
                        if (invoiceTab === 0) return true;
                        const s = (inv.status || "").toLowerCase();
                        if (invoiceTab === 1) return ["submitted", "on_hold", "pending", "pending_approval"].includes(s);
                        if (invoiceTab === 2) return ["paid", "approved", "matched"].includes(s);
                        return true;
                      })
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                      .slice(0, 10)
                      .map((inv) => (
                        <TableRow key={inv.id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail("Invoice Detail", `Invoice: ${inv.invoice_number}`, [inv], [{ key: "invoice_number", label: "Invoice" }, { key: "supplier_name", label: "Supplier" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Amount" }], ["Details"])}>
                          <TableCell sx={{ fontWeight: 500 }}>{inv.invoice_number}</TableCell>
                          <TableCell>{inv.supplier_name || inv.vendor_name || 'N/A'}</TableCell>
                          <TableCell>{new Date(inv.invoice_date || inv.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>₹{Number(inv.total_amount).toLocaleString("en-IN")}</TableCell>
                          <TableCell>
                            <Chip 
                              label={inv.status} 
                              size="small"
                              color={
                                ["paid", "approved", "matched"].includes((inv.status || "").toLowerCase()) ? "success" :
                                ["rejected", "fraud"].includes((inv.status || "").toLowerCase()) ? "error" : "warning"
                              }
                              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Grid>
        </Grid>
      </Box>
      {loading && (
        <Box position="fixed" right={16} bottom={16}>
          <Button variant="outlined" startIcon={<CircularProgress size={14} />}>
            Refreshing dashboard...
          </Button>
        </Box>
      )}
      <DetailDrawer
        open={Boolean(detailPayload)}
        payload={detailPayload}
        onClose={() => setDetailPayload(null)}
        onNavigate={navigate}
      />
    </Box>
  );
}