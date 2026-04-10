import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function PRTracker({
  prs = [],
  purchaseOrders = [],
  grns = [],
  invoices = [],
  payments = [],
}) {
  // Get top 5 most recent PRs
  const recentPRs = [...prs]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Helper to trace a single PR's lifecycle
  const traceLifecycle = (pr) => {
    // 1. PR Phase
    let currentStep = 0;
    const prStatus = (pr.status || "pending").toLowerCase();
    
    // Default active states
    let po = null;
    let grn = null;
    let inv = null;
    let pay = null;

    if (prStatus === "accepted") {
      currentStep = 1; // PR Accepted, awaiting PO
      
      // 2. PO Phase
      po = purchaseOrders.find((p) => p.pr_id === pr.id);
      if (po) {
        const poStatus = (po.status || "").toLowerCase();
        if (poStatus === "sent" || poStatus === "accepted" || poStatus === "partially_received" || poStatus === "fully_received" || poStatus === "invoiced" || poStatus === "closed") {
          currentStep = 2; // PO confirmed, awaiting GRN
          
          // 3. GRN Phase
          grn = grns.find((g) => g.po_id === po.id);
          if (grn || poStatus === "fully_received" || poStatus === "partially_received" || poStatus === "invoiced" || poStatus === "closed") {
            currentStep = 3; // Goods received, awaiting Invoice
            
            // 4. Invoice Phase
            inv = invoices.find((i) => i.po_id === po.id);
            if (inv) {
              currentStep = 4; // Invoiced, awaiting Payment
              
              // 5. Payment Phase
              pay = payments.find((p) => p.invoice_id === inv.id);
              if (pay && pay.status === "paid") {
                currentStep = 5; // Paid, workflow complete
              }
            }
          }
        }
      }
    }

    return { currentStep, prStatus, po, grn, inv, pay };
  };

  const steps = [
    "PR Submitted",
    "PO Generated",
    "Goods Received",
    "Invoice Processed",
    "Payment Sent",
  ];

  if (recentPRs.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="text.secondary">
          No Purchase Requests found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={2}>
        {recentPRs.map((pr) => {
          const { currentStep, prStatus, po, grn, inv, pay } = traceLifecycle(pr);
          let prColor = "warning";
          if (prStatus === "accepted") prColor = "success";
          if (prStatus === "rejected") prColor = "error";

          return (
            <Accordion key={pr.id} disableGutters sx={{ borderRadius: 2, "&:before": { display: "none" }, border: "1px solid #e2e8f0", boxShadow: "none" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" justifyContent="space-between" width="100%" alignItems="center" pr={2}>
                  <Box>
                    <Typography fontWeight={700}>
                      {pr.pr_number || "Draft PR"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(pr.created_at).toLocaleDateString()} • ₹{Number(pr.total_amount || 0).toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                  <Chip size="small" color={prColor} label={prStatus.toUpperCase()} />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: "#fafaf9", pt: 3 }}>
                <Stepper activeStep={currentStep} alternativeLabel>
                  {steps.map((label, index) => {
                    // Injecting dynamic sub-labels depending on the step
                    let subLabel = "";
                    if (index === 0) subLabel = prStatus === "accepted" ? "Approved" : prStatus === "rejected" ? "Declined" : "Pending Vendor";
                    if (index === 1 && po) subLabel = po.po_number;
                    if (index === 2 && grn) subLabel = grn.grn_number;
                    if (index === 3 && inv) subLabel = inv.invoice_number;
                    if (index === 4 && pay) subLabel = pay.status;

                    return (
                      <Step key={label}>
                        <StepLabel
                          optional={<Typography variant="caption" color="textSecondary">{subLabel}</Typography>}
                        >
                          {label}
                        </StepLabel>
                      </Step>
                    );
                  })}
                </Stepper>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Box>
  );
}
