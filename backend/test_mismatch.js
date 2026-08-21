import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runMismatchTest() {
    const poId = '5eb3941a-ea4e-4ae9-ac17-b61a75fc84ea';
    const orgId = '11111111-1111-1111-1111-111111111111';

    console.log(`Using PO ID: ${poId}`);

    // 1. Insert GRN (Short Receiving)
    const { data: grn, error: grnError } = await supabase.from('grns').insert([{
        org_id: orgId,
        po_id: poId,
        grn_number: `GRN-TEST-${Math.floor(Math.random() * 10000)}`,
        grn_date: new Date().toISOString().split('T')[0],
        status: 'received',
        embedded: false
    }]).select().single();

    if (grnError) throw grnError;
    console.log(`Inserted GRN: ${grn.id}`);

    const { error: grnItemsError } = await supabase.from('grn_items').insert([
        { grn_id: grn.id, item_name_snapshot: 'M8 Bolts', quantity_received: 400, quantity_accepted: 400, quantity_rejected: 0 },
        { grn_id: grn.id, item_name_snapshot: 'Steel Plates', quantity_received: 20, quantity_accepted: 20, quantity_rejected: 0 }
    ]);

    if (grnItemsError) throw grnItemsError;
    console.log(`Inserted short-received GRN items (400 instead of 500 bolts)`);

    // 2. Insert Invoice (Over billing)
    const { data: invoice, error: invError } = await supabase.from('invoices').insert([{
        org_id: orgId,
        po_id: poId,
        invoice_number: `INV-TEST-${Math.floor(Math.random() * 10000)}`,
        invoice_date: new Date().toISOString().split('T')[0],
        supplier_name: 'Test Supplier Inc',
        status: 'submitted',
        total_amount: 1500, // Expected was 1180
        embedded: false
    }]).select().single();

    if (invError) throw invError;
    console.log(`Inserted Invoice: ${invoice.id}`);

    const { error: invItemsError } = await supabase.from('invoice_items').insert([
        { invoice_id: invoice.id, item_name_snapshot: 'M8 Bolts', quantity: 500, unit_price: 2.5, taxable_value: 1250, gst_amount: 225, total_amount: 1475 },
        { invoice_id: invoice.id, item_name_snapshot: 'Steel Plates', quantity: 20, unit_price: 50, taxable_value: 1000, gst_amount: 180, total_amount: 1180 }
    ]);
    
    if (invItemsError) throw invItemsError;
    console.log(`Inserted invoice items (billed for 500 bolts at higher price)`);

    // 3. Trigger the Match API
    console.log(`Triggering 3-way match API...`);
    const res = await fetch('http://localhost:3001/api/validate/grn-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, po_id: poId, grn_id: grn.id, invoice_id: invoice.id })
    });
    
    const apiResult = await res.json();
    console.log('API Response:', JSON.stringify(apiResult, null, 2));

    // 4. Verify Database Statuses
    const { data: assessment } = await supabase.from('fraud_assessments').select('*').eq('invoice_id', invoice.id).single();
    const { data: updatedInvoice } = await supabase.from('invoices').select('status').eq('id', invoice.id).single();

    console.log('\n--- VERIFICATION ---');
    console.log(`Invoice Final Status: ${updatedInvoice.status}`);
    console.log(`Fraud Assessment Match Status: ${assessment.match_status}`);
    console.log(`Match Details Stored:`, JSON.stringify(assessment.match_details, null, 2));
}

runMismatchTest().catch(console.error);
