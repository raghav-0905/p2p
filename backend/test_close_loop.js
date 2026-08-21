import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runCloseLoopTest() {
    const poId = '5eb3941a-ea4e-4ae9-ac17-b61a75fc84ea';
    const orgId = '11111111-1111-1111-1111-111111111111';

    console.log(`Using PO ID: ${poId}`);

    // 1. First, we need to correct the Invoice amount. 
    // In the previous test, the vendor maliciously overbilled (₹1500 instead of ₹1180).
    // A GRN alone cannot override a price dispute. So we will simulate the vendor
    // submitting a corrected invoice / credit note bringing the invoice total back down to ₹1180.
    
    const { data: invoices } = await supabase.from('invoices').select('id').eq('po_id', poId).eq('total_amount', 1500);
    const invoiceId = invoices[0]?.id;

    if (!invoiceId) {
        console.error("Could not find the mismatched invoice.");
        return;
    }

    await supabase.from('invoices').update({ total_amount: 1180 }).eq('id', invoiceId);
    console.log(`Corrected the vendor's invoice amount down to the approved PO amount (₹1180).`);

    // 2. Insert the missing GRN for the remaining 100 Bolts
    const { data: grn, error: grnError } = await supabase.from('grns').insert([{
        org_id: orgId,
        po_id: poId,
        grn_number: `GRN-TEST-FIX-${Math.floor(Math.random() * 10000)}`,
        grn_date: new Date().toISOString().split('T')[0],
        status: 'received',
        embedded: false
    }]).select().single();

    if (grnError) throw grnError;
    console.log(`Inserted second GRN: ${grn.id}`);

    const { error: grnItemsError } = await supabase.from('grn_items').insert([
        { grn_id: grn.id, item_name_snapshot: 'M8 Bolts', quantity_received: 100, quantity_accepted: 100, quantity_rejected: 0 }
    ]);

    if (grnItemsError) throw grnItemsError;
    console.log(`Inserted received GRN items (The missing 100 bolts)`);

    // 3. Trigger the Match API
    console.log(`Triggering 3-way match API automatically...`);
    const res = await fetch('http://localhost:3001/api/validate/grn-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, po_id: poId, grn_id: grn.id, invoice_id: invoiceId })
    });
    
    const apiResult = await res.json();
    console.log('API Response:', JSON.stringify(apiResult, null, 2));

    // 4. Verify Database Statuses
    const { data: assessment } = await supabase.from('fraud_assessments').select('*').eq('invoice_id', invoiceId).single();
    const { data: updatedInvoice } = await supabase.from('invoices').select('status').eq('id', invoiceId).single();

    console.log('\n--- LOOP CLOSED VERIFICATION ---');
    console.log(`Invoice Final Status: ${updatedInvoice.status}`);
    console.log(`Fraud Assessment Match Status: ${assessment.match_status}`);
    console.log(`Match Details Stored:`, JSON.stringify(assessment.match_details, null, 2));
}

runCloseLoopTest().catch(console.error);
