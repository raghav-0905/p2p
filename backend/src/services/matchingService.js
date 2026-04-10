import { supabase } from "../supabaseClient.js";

/**
 * Performs a 3-way match between PO, GRN, and Invoice(s).
 * If invoiceId is provided, matches against that specific invoice.
 * Otherwise, matches against all invoices associated with the PO.
 */
export const perform3WayMatch = async (orgId, poId, grnId, invoiceId = null) => {
  try {
    // 1. Fetch PO and PO Items
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("*, purchase_order_items(*)")
      .eq("id", poId)
      .single();

    if (poError || !po) throw new Error("PO not found");

    // 2. Fetch all GRNs and GRN Items for cumulative receiving
    const { data: grns, error: grnsError } = await supabase
      .from("grns")
      .select("*, grn_items(*)")
      .eq("po_id", poId);

    let grnData = null;
    let grnItems = [];

    if (!grnsError && grns && grns.length > 0) {
      // Keep reference to latest GRN just for ID linking
      grnData = grns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      
      // Accumulate all GRN items
      grns.forEach(g => {
        if (g.grn_items) {
          grnItems = grnItems.concat(g.grn_items);
        }
      });
    }

    // 3. Fetch Invoice(s)
    let invoicesQuery = supabase.from("invoices").select("*, invoice_items(*)").eq("po_id", poId);
    if (invoiceId) {
      invoicesQuery = invoicesQuery.eq("id", invoiceId);
    }
    const { data: invoices, error: invError } = await invoicesQuery;

    if (invError || !invoices || invoices.length === 0) {
      return { message: "No invoices found for this PO yet to perform 3-way match." };
    }

    const results = [];

    // 4. Compare for each invoice
    for (const inv of invoices) {
      let matchStatus = "pending";
      let matchDetails = {
        qty_match: false,
        amount_match: false,
        amount_diff: 0,
        mismatched_items: [],
      };

      // Amount Match Check (Partial invoices have lower amounts)
      const poAmount = Number(po.total_amount) || 0;
      const invAmount = Number(inv.total_amount) || 0;
      const diff = Math.abs(poAmount - invAmount);
      matchDetails.amount_diff = diff;

      if (invAmount <= poAmount * 1.05) { // 5% tolerance for tax differences or partial invoices
        matchDetails.amount_match = true;
      } else if (poAmount === 0 && invAmount === 0) {
        matchDetails.amount_match = true;
      }

      // Quantity Match Check (if GRN exists)
      if (grnData && grnItems.length > 0) {
        const poItemsMap = {};
        po.purchase_order_items.forEach(i => poItemsMap[i.item_name_snapshot] = Number(i.quantity));

        const grnItemsMap = {};
        // Sum accepted quantities for cumulative match
        grnItems.forEach(i => {
           grnItemsMap[i.item_name_snapshot] = (grnItemsMap[i.item_name_snapshot] || 0) + Number(i.quantity_accepted);
        });

        const invItemsMap = {};
        (inv.invoice_items || []).forEach(i => {
           invItemsMap[i.item_name_snapshot] = (invItemsMap[i.item_name_snapshot] || 0) + Number(i.quantity);
        });

        let allQtysMatch = true;
        const mismatchedItemNames = [];

        // Check each invoice item against cumulative GRN and PO
        for (const [itemName, invQty] of Object.entries(invItemsMap)) {
          const grnQty = grnItemsMap[itemName] || 0;
          const poQty = poItemsMap[itemName] || 0;

          // Vendor can't invoice for more than they delivered (GRN) or ordered (PO)
          if (invQty > grnQty || invQty > poQty) {
            allQtysMatch = false;
            mismatchedItemNames.push({
              item: itemName,
              po_qty: poQty,
              grn_qty: grnQty,
              inv_qty: invQty
            });
          }
        }

        matchDetails.qty_match = allQtysMatch;
        matchDetails.mismatched_items = mismatchedItemNames;

        if (matchDetails.amount_match && matchDetails.qty_match) {
          matchStatus = "matched";
        } else if (!matchDetails.amount_match && !matchDetails.qty_match) {
          matchStatus = "mismatch";
        } else {
          matchStatus = "partial";
        }
      } else {
        // No GRN yet - wait for delivery
        matchStatus = "pending";
        matchDetails.note = "Awaiting GRN for quantity match";
      }

      // 5. Update fraud_assessments
      // Upsert into fraud_assessments (only update match fields if assessing existing, or create new if not exists)
      const { data: existingAssessment } = await supabase
        .from("fraud_assessments")
        .select("id")
        .eq("invoice_id", inv.id)
        .single();

      if (existingAssessment) {
        await supabase
          .from("fraud_assessments")
          .update({
            match_status: matchStatus,
            match_details: matchDetails,
            po_id: poId,
            grn_id: grnData ? grnData.id : null,
          })
          .eq("id", existingAssessment.id);
      } else {
         await supabase
          .from("fraud_assessments")
          .insert([{
            org_id: orgId,
            invoice_id: inv.id,
            po_id: poId,
            grn_id: grnData ? grnData.id : null,
            match_status: matchStatus,
            match_details: matchDetails,
            supplier_name: inv.supplier_name,
            invoice_amount: inv.total_amount
          }]);
      }

      let finalStatus = inv.status;
      if (matchStatus === "matched") {
        finalStatus = "approved";
      } else if (matchStatus === "pending") {
        // Keep it submitted while waiting for perfect match to avoid premature under_review
        finalStatus = inv.status;
      } else {
        // Any mismatch or 'partial' discrepancy warrants human review
        finalStatus = "under_review";
      }

      await supabase
        .from("invoices")
        .update({ status: finalStatus })
        .eq("id", inv.id);

      results.push({ invoiceId: inv.id, matchStatus, matchDetails });
    }

    return { success: true, results };
  } catch (error) {
    console.error("Match error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Validates if the PO should be closed based on payment statuses and matching invoice amounts.
 */
export const validatePOPaymentClosure = async (poId) => {
  try {
    // 1. Fetch PO to get total amount
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("id, total_amount, status")
      .eq("id", poId)
      .single();

    if (poError || !po) throw new Error("PO not found");
    if (po.status === "closed") return { success: true, message: "PO is already closed." };

    // 2. Fetch all invoices for this PO
    const { data: invoices, error: invError } = await supabase
      .from("invoices")
      .select("id, total_amount, status")
      .eq("po_id", poId);

    if (invError || !invoices || invoices.length === 0) {
      return { success: false, message: "No invoices found for PO." };
    }

    // 3. Validation Rules:
    // rule a: all fetched invoices must be paid
    const allPaid = invoices.every(inv => inv.status === "paid");
    
    // rule b: sum of all invoices must match PO amount (within 5% tolerance max, or exact)
    const poTotal = Number(po.total_amount) || 0;
    const invTotalSum = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
    
    // Check if the invoiced sum matches PO total (allow up to 2% difference for rounding/taxes)
    const amountMatches = (poTotal === 0 && invTotalSum === 0) || 
      (Math.abs(poTotal - invTotalSum) <= poTotal * 0.05);

    if (allPaid && amountMatches) {
      // 4. Close the PO
      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", poId);

      if (updateError) throw updateError;
      return { success: true, closed: true, message: "PO successfully closed because all invoices are paid and amounts match." };
    } else {
      return { 
        success: true, 
        closed: false, 
        message: "PO remains open.", 
        details: { allPaid, amountMatches, poTotal, invTotalSum } 
      };
    }
  } catch (error) {
    console.error("PO payment closure validation error:", error);
    return { success: false, error: error.message };
  }
};
