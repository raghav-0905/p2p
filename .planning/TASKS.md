# P2P Multi-Org & Line Items Implementation TODO

## ✅ Phase 1: Database Setup (Complete)
- [x] schema_updates_v2.sql exists (line_items JSONB + vendor_organizations table)

## ✅ Phase 2: PurchaseOrderForm Upgrade (Complete)  
- [x] Dynamic line items array input (Item/Qty/Rate/Tax/Total)
- [x] Auto-calculate total_amount from sum
- [x] Highlighted vendor picker (blue styling)

## ✅ Phase 3: Multi-Org Vendor Expansion (Complete)  
- [✅] Step 1: Update Register.jsx (multi-select orgs → vendor_organizations inserts)
- [✅] Step 2: Update VendorDashboard.jsx (realtime org listener + Connect UI/alerts)
- [ ] Step 3: User runs schema_updates_v2.sql in Supabase
- [ ] Step 4: Test registration + dashboard alerts + connects
- [ ] Step 5: Verify end-to-end (PO creation + multi-org vendor view)
