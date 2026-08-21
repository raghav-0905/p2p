import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insertPO() {
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs || orgs.length === 0) {
      console.log("No organizations found to attach PO to.");
      return;
  }
  const org_id = orgs[0].id;
  const newPO = {
    org_id: org_id,
    po_number: `PO-TEST-${Math.floor(Math.random() * 10000)}`,
    po_date: new Date().toISOString().split('T')[0],
    supplier_name: 'Test Supplier Inc',
    status: 'draft',
    total_taxable_value: 1000,
    total_gst_value: 180,
    total_amount: 1180,
    embedded: false
  };

  console.log('Inserting new PO...', newPO);

  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([newPO])
    .select();

  if (error) {
    console.error('Error inserting PO:', error.message);
    return;
  }
  
  const poId = data[0].id;
  
  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert([
        { po_id: poId, item_name_snapshot: 'M8 Bolts', quantity: 500, unit_price: 2, taxable_value: 1000, gst_amount: 180, total_amount: 1180 },
        { po_id: poId, item_name_snapshot: 'Steel Plates', quantity: 20, unit_price: 50, taxable_value: 1000, gst_amount: 180, total_amount: 1180 }
    ]);

  if (itemsError) {
      console.error('Error inserting PO items:', itemsError.message);
      return;
  }

  console.log('Successfully inserted PO with ID:', poId);
  console.log('Org ID (Pinecone Namespace):', data[0].org_id);
}

insertPO();
