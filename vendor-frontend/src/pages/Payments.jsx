import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, CircularProgress } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();

    const channel = supabase.channel('vendor-payments-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: vendor } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (vendor) {
        // Find all invoices for this vendor
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, invoice_number")
          .eq("supplier_name", vendor.company_name);
          
        if (invoices && invoices.length > 0) {
          const invoiceIds = invoices.map(inv => inv.id);
          const invoiceMap = invoices.reduce((acc, inv) => ({...acc, [inv.id]: inv.invoice_number}), {});

          const { data: payData } = await supabase
            .from("payments")
            .select("*")
            .in("invoice_id", invoiceIds)
            .order('created_at', { ascending: false });
            
          if (payData) {
            setPayments(payData.map(p => ({
              ...p,
              invoice_number: invoiceMap[p.invoice_id]
            })));
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#1e293b" mb={1}>Payment Status</Typography>
          <Typography color="text.secondary">View payments received and track upcoming scheduled payouts.</Typography>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell>Payment ID</TableCell>
                  <TableCell>Against Invoice</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Date / Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Receipt</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center">No payment records found.</TableCell></TableRow>
                ) : payments.map((pay) => (
                  <TableRow key={pay.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{pay.id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{pay.invoice_number || 'N/A'}</TableCell>
                    <TableCell>₹{Number(pay.amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{new Date(pay.payment_due_date || pay.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip label={pay.status} size="small" color={(pay.status || "").toLowerCase() === "paid" ? "success" : "warning"} sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right">
                      {(pay.status || "").toLowerCase() === "paid" ? (
                        <Button size="small" variant="outlined" startIcon={<DownloadIcon />}>Advice</Button>
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
