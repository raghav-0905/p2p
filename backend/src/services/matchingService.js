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

    // 2. Fetch GRN and GRN Items
    let grnData = null;
    let grnItems = [];
    if (grnId) {
      const { data: grn, error: grnError } = await supabase
        .from("grns")
        .select("*, grn_items(*)")
        .eq("id", grnId)
        .single();
      if (!grnError && grn) {
        grnData = grn;
        grnItems = grn.grn_items || [];
      }
    } else {
      // Find latest GRN for this PO
      const { data: grns } = await supabase
        .from("grns")
        .select("*, grn_items(*)")
        .eq("po_id", poId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (grns && grns.length > 0) {
        grnData = grns[0];
        grnItems = grnData.grn_items || [];
      }
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
        grnItems.forEach(i => grnItemsMap[i.item_name_snapshot] = Number(i.quantity_accepted));

        const invItemsMap = {};
        (inv.invoice_items || []).forEach(i => invItemsMap[i.item_name_snapshot] = Number(i.quantity));

        let allQtysMatch = true;
        const mismatchedItemNames = [];

        // Check each invoice item against GRN and PO
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
