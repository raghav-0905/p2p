import { createClient } from '@supabase/supabase-js';
import { Pinecone } from '@pinecone-database/pinecone';
import { pipeline } from '@xenova/transformers';

let supabase = null;
let pinecone = null;
let pineconeIndex = null;

function initClients() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  if (!pinecone) {
    pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);
  }
}

let extractor = null;

async function getExtractor() {
  if (!extractor) {
    // using all-MiniLM-L6-v2 which has 384 dims
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

// Helper to truncate line items for metadata to avoid blowing up Pinecone limits
function summarizeLineItems(items, type) {
    if (!items || items.length === 0) return "No line items";
    return items.map(item => {
        if (type === 'po') return `${item.item_name_snapshot}: qty ${item.quantity} @ ${item.unit_price} (GST: ${item.gst_amount})`;
        if (type === 'grn') return `${item.item_name_snapshot}: rec ${item.quantity_received} (acc ${item.quantity_accepted || 0}, rej ${item.quantity_rejected || 0})`;
        if (type === 'invoice') return `${item.item_name_snapshot}: qty ${item.quantity} @ ${item.unit_price} (GST: ${item.gst_amount})`;
        if (type === 'pr') return `${item.item_name}: qty ${item.quantity} @ ${item.unit_price} (GST: ${item.gst_amount})`;
        return item.item_name_snapshot || item.item_name;
    }).join(' | ').substring(0, 500); // hard truncate string to prevent limit issues
}

async function processPurchaseOrders(extract) {
    const { data: rows, error } = await supabase
        .from('purchase_orders')
        .select('*, purchase_order_items(*)')
        .eq('embedded', false)
        .limit(50);
        
    if (error) throw error;
    if (!rows || rows.length === 0) return;
    console.log(`Processing ${rows.length} rows from purchase_orders...`);

    for (const row of rows) {
        try {
            const items = row.purchase_order_items || [];
            const itemText = items.map(i => `${i.quantity}x ${i.item_name_snapshot} at ${i.unit_price} (Total: ${i.total_amount})`).join(', ');
            
            const text = `Purchase Order ${row.po_number} for vendor ${row.supplier_name}. Total: ${row.total_amount}. Status: ${row.status}. Created by: ${row.created_by || 'Unknown'}. Date: ${row.po_date}. Items: ${itemText || 'None'}.`;
            
            const output = await extract(text, { pooling: 'mean', normalize: true });
            
            await pineconeIndex.namespace(row.org_id).upsert([{
                id: `purchase_orders:${row.id}`,
                values: Array.from(output.data),
                metadata: {
                    table: 'purchase_orders',
                    row_id: row.id,
                    org_id: row.org_id,
                    created_at: row.created_at,
                    doc_number: row.po_number,
                    vendor_name: row.supplier_name,
                    status: row.status,
                    total_amount: row.total_amount || 0,
                    created_by: row.created_by || '',
                    line_items_summary: summarizeLineItems(items, 'po')
                }
            }]);
            
            await supabase.from('purchase_orders').update({ embedded: true }).eq('id', row.id);
            console.log(`Successfully embedded PO:${row.id}`);
        } catch (e) {
            console.error(`Error processing PO ${row.id}:`, e.message);
        }
    }
}

async function processGRNs(extract) {
    const { data: rows, error } = await supabase
        .from('grns')
        .select('*, grn_items(*), purchase_orders(po_number, supplier_name)')
        .eq('embedded', false)
        .limit(50);
        
    if (error) throw error;
    if (!rows || rows.length === 0) return;
    console.log(`Processing ${rows.length} rows from grns...`);

    for (const row of rows) {
        try {
            const items = row.grn_items || [];
            const po = row.purchase_orders || {};
            
            const itemText = items.map(i => `${i.quantity_received}x ${i.item_name_snapshot} (accepted ${i.quantity_accepted || 0}, rejected ${i.quantity_rejected || 0})`).join(', ');
            
            const text = `GRN ${row.grn_number} for PO ${po.po_number || 'Unknown'}, vendor ${po.supplier_name || 'Unknown'}, received ${row.grn_date}. Received by ${row.received_by || 'Unknown'}. Status: ${row.status}. Items: ${itemText || 'None'}.`;
            
            const output = await extract(text, { pooling: 'mean', normalize: true });
            
            await pineconeIndex.namespace(row.org_id).upsert([{
                id: `grns:${row.id}`,
                values: Array.from(output.data),
                metadata: {
                    table: 'grns',
                    row_id: row.id,
                    org_id: row.org_id,
                    created_at: row.created_at,
                    doc_number: row.grn_number,
                    vendor_name: po.supplier_name || '',
                    status: row.status,
                    total_amount: 0,
                    created_by: row.received_by || '',
                    line_items_summary: summarizeLineItems(items, 'grn')
                }
            }]);
            
            await supabase.from('grns').update({ embedded: true }).eq('id', row.id);
            console.log(`Successfully embedded GRN:${row.id}`);
        } catch (e) {
            console.error(`Error processing GRN ${row.id}:`, e.message);
        }
    }
}

async function processInvoices(extract) {
    const { data: rows, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*), purchase_orders(po_number)')
        .eq('embedded', false)
        .limit(50);
        
    if (error) throw error;
    if (!rows || rows.length === 0) return;
    console.log(`Processing ${rows.length} rows from invoices...`);

    for (const row of rows) {
        try {
            const items = row.invoice_items || [];
            const po = row.purchase_orders || {};
            
            const itemText = items.map(i => `${i.quantity}x ${i.item_name_snapshot} at ${i.unit_price} (Total: ${i.total_amount})`).join(', ');
            
            const text = `Invoice ${row.invoice_number} for PO ${po.po_number || 'Unknown'}, vendor ${row.supplier_name}, dated ${row.invoice_date}. Total: ${row.total_amount}. Status: ${row.status}. Items: ${itemText || 'None'}.`;
            
            const output = await extract(text, { pooling: 'mean', normalize: true });
            
            await pineconeIndex.namespace(row.org_id).upsert([{
                id: `invoices:${row.id}`,
                values: Array.from(output.data),
                metadata: {
                    table: 'invoices',
                    row_id: row.id,
                    org_id: row.org_id,
                    created_at: row.created_at,
                    doc_number: row.invoice_number,
                    vendor_name: row.supplier_name,
                    status: row.status,
                    total_amount: row.total_amount || 0,
                    created_by: row.approved_by || '',
                    line_items_summary: summarizeLineItems(items, 'invoice')
                }
            }]);
            
            await supabase.from('invoices').update({ embedded: true }).eq('id', row.id);
            console.log(`Successfully embedded Invoice:${row.id}`);
        } catch (e) {
            console.error(`Error processing Invoice ${row.id}:`, e.message);
        }
    }
}

async function processPurchaseRequests(extract) {
    const { data: rows, error } = await supabase
        .from('purchase_requests')
        .select('*, purchase_request_items(*), vendors(company_name)')
        .eq('embedded', false)
        .limit(50);
        
    if (error) throw error;
    if (!rows || rows.length === 0) return;
    console.log(`Processing ${rows.length} rows from purchase_requests...`);

    for (const row of rows) {
        try {
            const items = row.purchase_request_items || [];
            const vendor = row.vendors || {};
            
            const itemText = items.map(i => `${i.quantity}x ${i.item_name} at ${i.unit_price} (Total: ${i.total_amount})`).join(', ');
            
            const text = `Purchase Request ${row.pr_number} from vendor ${vendor.company_name || 'Unknown'}. Total: ${row.total_amount}. Status: ${row.status}. Notes: ${row.notes || 'None'}. Items: ${itemText || 'None'}.`;
            
            const output = await extract(text, { pooling: 'mean', normalize: true });
            
            await pineconeIndex.namespace(row.org_id).upsert([{
                id: `purchase_requests:${row.id}`,
                values: Array.from(output.data),
                metadata: {
                    table: 'purchase_requests',
                    row_id: row.id,
                    org_id: row.org_id,
                    created_at: row.created_at,
                    doc_number: row.pr_number,
                    vendor_name: vendor.company_name || '',
                    status: row.status,
                    total_amount: row.total_amount || 0,
                    created_by: row.vendor_id || '',
                    line_items_summary: summarizeLineItems(items, 'pr')
                }
            }]);
            
            await supabase.from('purchase_requests').update({ embedded: true }).eq('id', row.id);
            console.log(`Successfully embedded PR:${row.id}`);
        } catch (e) {
            console.error(`Error processing PR ${row.id}:`, e.message);
        }
    }
}

export async function runPollingCycle() {
  initClients();
  console.log(`[${new Date().toISOString()}] Starting polling cycle...`);
  const extract = await getExtractor();

  try {
      await processPurchaseOrders(extract);
      await processGRNs(extract);
      await processInvoices(extract);
      await processPurchaseRequests(extract);
  } catch(e) {
      console.error("Top level polling error:", e);
  }

  console.log(`[${new Date().toISOString()}] Finished polling cycle.`);
}
