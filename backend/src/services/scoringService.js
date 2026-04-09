import { supabase } from "../supabaseClient.js";
import axios from "axios";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:5000";

// Helper to determine risk level
const getRiskLevel = (probability) => {
  if (probability < 0.3) return "low";
  if (probability < 0.6) return "medium";
  if (probability < 0.8) return "high";
  return "critical";
};

export const scoreInvoice = async (orgId, invoiceId) => {
  try {
    // 1. Fetch Invoice
    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invError || !inv) throw new Error("Invoice not found");

    // 2. Fetch Supplier history to calculate features
    const supplierName = inv.supplier_name;
    const { data: supplierInvoices } = await supabase
      .from("invoices")
      .select("total_amount, created_at, status")
      .eq("supplier_name", supplierName);

    // Calculate features
    const invoiceAmount = Number(inv.total_amount) || 0;
    const logInvoiceAmount = Math.log1p(invoiceAmount);

    let supplierMeanAmount = invoiceAmount;
    let supplierStdAmount = 0;
    let supplierMedianAmount = invoiceAmount;
    let supplierMaxAmount = invoiceAmount;
    let supplierTotalInvoices = 1;

    let amountToSupplierAvgRatio = 1;
    let amountDeviationFromSupplier = 0;
    let isHighAmountForSupplier = 0;

    let stdAmount = 0;

    if (supplierInvoices && supplierInvoices.length > 0) {
      const amounts = supplierInvoices.map((i) => Number(i.total_amount) || 0);
      supplierTotalInvoices = amounts.length;
      
      const sum = amounts.reduce((a, b) => a + b, 0);
      supplierMeanAmount = sum / amounts.length;
      
      supplierMaxAmount = Math.max(...amounts);
      
      amounts.sort((a, b) => a - b);
      const mid = Math.floor(amounts.length / 2);
      supplierMedianAmount = amounts.length % 2 !== 0 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2;

      if (amounts.length > 1) {
        const variance = amounts.reduce((a, b) => a + Math.pow(b - supplierMeanAmount, 2), 0) / (amounts.length - 1);
        stdAmount = Math.sqrt(variance);
        supplierStdAmount = stdAmount;
      }

      amountToSupplierAvgRatio = invoiceAmount / (supplierMeanAmount + 1);
      amountDeviationFromSupplier = stdAmount > 0 ? Math.abs(invoiceAmount - supplierMeanAmount) / stdAmount : 0;
      isHighAmountForSupplier = invoiceAmount > (supplierMeanAmount + 1.28 * stdAmount) ? 1 : 0;
    }

    // Default historical behavior features since we lack deep history
    const supplierAvgAmount90d = supplierMeanAmount;
    const supplierInvoiceCount30d = supplierInvoices ? supplierInvoices.filter(i => {
       const diff = Date.now() - new Date(i.created_at).getTime();
       return diff <= 30 * 24 * 60 * 60 * 1000;
    }).length : 1;
    
    // Check if created late night (between 10 PM and 5 AM)
    const invDate = new Date(inv.created_at);
    const hours = invDate.getHours();
    const lateNightSubmissionFlag = (hours >= 22 || hours <= 5) ? 1 : 0;

    // Dept avg amount (mock/simplification: just compare to invoice amount for now, or calculate if we had dept mapping)
    const amountToDeptAvgRatio = 1.0; 

    const mlPayload = {
      invoice_amount: invoiceAmount,
      log_invoice_amount: logInvoiceAmount,
      amount_to_supplier_avg_ratio: amountToSupplierAvgRatio,
      amount_deviation_from_supplier: amountDeviationFromSupplier,
      is_high_amount_for_supplier: isHighAmountForSupplier,
      amount_to_dept_avg_ratio: amountToDeptAvgRatio,
      supplier_std_amount: supplierStdAmount,
      supplier_mean_amount: supplierMeanAmount,
      supplier_median_amount: supplierMedianAmount,
      supplier_max_amount: supplierMaxAmount,
      supplier_total_invoices: supplierTotalInvoices,
      supplier_avg_amount_90d: supplierAvgAmount90d,
      supplier_invoice_count_30d: supplierInvoiceCount30d,
      late_night_submission_flag: lateNightSubmissionFlag,
      
      // Need a dummy date for ML date engineered features
      invoice_date: inv.invoice_date || new Date().toISOString().split('T')[0],
      department_id: "DUMMY",
      supplier_id: "DUMMY"
    };

    // 3. Call ML API
    let mlResponse = { data: { fraud_probability: 0.1, is_fraud: 0, feature_contributions: {} } };
    try {
      mlResponse = await axios.post(`${ML_API_URL}/predict`, mlPayload);
    } catch (apiError) {
      console.warn("ML API failed, using fallback:", apiError.message);
      // Fallback response for dev if ML is down
    }

    const { fraud_probability, is_fraud, feature_contributions } = mlResponse.data;
    const riskLevel = getRiskLevel(fraud_probability);

    // 4. Store in fraud_assessments
    const { data: existingAssessment } = await supabase
      .from("fraud_assessments")
      .select("id")
      .eq("invoice_id", invoiceId)
      .single();

    if (existingAssessment) {
      await supabase.from("fraud_assessments").update({
        fraud_probability,
        is_fraud: is_fraud === 1,
        risk_level: riskLevel,
        feature_contributions: feature_contributions || {},
        supplier_name: inv.supplier_name,
        invoice_amount: inv.total_amount
      }).eq("id", existingAssessment.id);
    } else {
      await supabase.from("fraud_assessments").insert([{
        org_id: orgId,
        invoice_id: inv.id,
        po_id: inv.po_id,
        fraud_probability,
        is_fraud: is_fraud === 1,
        risk_level: riskLevel,
        feature_contributions: feature_contributions || {},
        supplier_name: inv.supplier_name,
        invoice_amount: inv.total_amount
      }]);
    }

    // Update invoice status natively if fraud detected
    if (is_fraud === 1) {
       await supabase.from("invoices").update({ status: "rejected" }).eq("id", invoiceId);
    }

    return { success: true, riskLevel, fraudProbability: fraud_probability };

  } catch (error) {
    console.error("Scoring error:", error);
    return { success: false, error: error.message };
  }
};
