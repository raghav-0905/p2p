## Table `organizations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `legal_name` | `text` |  |
| `trade_name` | `text` |  Nullable |
| `gstin` | `varchar` |  Nullable |
| `pan` | `varchar` |  Nullable |
| `address` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `state` | `text` |  Nullable |
| `country` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `org_code` | `text` |  Nullable |
| `risk_score` | `int4` |  Nullable |

## Table `organization_users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `role` | `text` |  |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `items_master`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `item_code` | `text` |  Nullable |
| `item_name` | `text` |  |
| `description` | `text` |  Nullable |
| `hsn_code` | `varchar` |  Nullable |
| `gst_rate` | `numeric` |  |
| `unit_of_measure` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `purchase_orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `po_number` | `text` |  |
| `po_date` | `date` |  |
| `supplier_name` | `text` |  |
| `supplier_gstin` | `varchar` |  Nullable |
| `supplier_address` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `total_taxable_value` | `numeric` |  Nullable |
| `total_gst_value` | `numeric` |  Nullable |
| `total_amount` | `numeric` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `acknowledged_at` | `timestamptz` |  Nullable |
| `closed_at` | `timestamptz` |  Nullable |
| `pr_id` | `uuid` |  Nullable |

## Table `purchase_order_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `po_id` | `uuid` |  |
| `item_id` | `uuid` |  Nullable |
| `item_name_snapshot` | `text` |  |
| `hsn_code_snapshot` | `varchar` |  Nullable |
| `gst_rate_snapshot` | `numeric` |  Nullable |
| `quantity` | `numeric` |  |
| `unit_price` | `numeric` |  |
| `taxable_value` | `numeric` |  |
| `gst_amount` | `numeric` |  |
| `total_amount` | `numeric` |  |

## Table `grns`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `po_id` | `uuid` |  |
| `grn_number` | `text` |  |
| `grn_date` | `date` |  |
| `received_by` | `uuid` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `invoice_id` | `uuid` |  Nullable |

## Table `grn_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `grn_id` | `uuid` |  |
| `po_item_id` | `uuid` |  Nullable |
| `item_name_snapshot` | `text` |  |
| `quantity_received` | `numeric` |  |
| `quantity_accepted` | `numeric` |  Nullable |
| `quantity_rejected` | `numeric` |  Nullable |
| `remarks` | `text` |  Nullable |

## Table `invoices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `po_id` | `uuid` |  Nullable |
| `invoice_number` | `text` |  |
| `invoice_date` | `date` |  |
| `supplier_name` | `text` |  |
| `supplier_gstin` | `varchar` |  Nullable |
| `status` | `text` |  Nullable |
| `total_taxable_value` | `numeric` |  Nullable |
| `total_gst_value` | `numeric` |  Nullable |
| `total_amount` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `approved_by` | `uuid` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |
| `payment_date` | `date` |  Nullable |

## Table `invoice_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `invoice_id` | `uuid` |  |
| `po_item_id` | `uuid` |  Nullable |
| `grn_item_id` | `uuid` |  Nullable |
| `item_name_snapshot` | `text` |  |
| `hsn_code_snapshot` | `varchar` |  Nullable |
| `gst_rate_snapshot` | `numeric` |  Nullable |
| `quantity` | `numeric` |  |
| `unit_price` | `numeric` |  |
| `taxable_value` | `numeric` |  |
| `gst_amount` | `numeric` |  |
| `total_amount` | `numeric` |  |

## Table `audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `entity_type` | `text` |  Nullable |
| `entity_id` | `uuid` |  Nullable |
| `action` | `text` |  Nullable |
| `performed_by` | `uuid` |  Nullable |
| `performed_at` | `timestamptz` |  Nullable |
| `metadata` | `jsonb` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `vendors`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `org_id` | `uuid` |  Nullable |
| `company_name` | `text` |  |
| `contact_email` | `text` |  |
| `gstin` | `text` |  Nullable |
| `pan` | `text` |  Nullable |
| `address` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `bank_account_name` | `text` |  Nullable |
| `bank_account_number` | `text` |  Nullable |
| `bank_ifsc` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `risk_score` | `float8` |  Nullable |

## Table `vendor_org_links`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `vendor_id` | `uuid` |  |
| `org_id` | `uuid` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `fraud_assessments`

Per-invoice ML fraud scoring results with SHAP feature contributions and 3-way match status

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `invoice_id` | `uuid` |  Unique |
| `po_id` | `uuid` |  Nullable |
| `grn_id` | `uuid` |  Nullable |
| `fraud_probability` | `float8` |  |
| `is_fraud` | `bool` |  |
| `risk_level` | `text` |  |
| `feature_contributions` | `jsonb` |  Nullable |
| `match_status` | `text` |  Nullable |
| `match_details` | `jsonb` |  Nullable |
| `supplier_name` | `text` |  Nullable |
| `invoice_amount` | `float8` |  Nullable |
| `assessed_at` | `timestamptz` |  |
| `model_version` | `text` |  Nullable |

## Table `payments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `invoice_id` | `uuid` |  Nullable |
| `amount` | `numeric` |  |
| `payment_due_date` | `timestamptz` |  Nullable |
| `status` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `purchase_requests`

Vendor-initiated purchase requests sent to customer orgs for approval

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pr_number` | `varchar` |  |
| `vendor_id` | `uuid` |  |
| `org_id` | `uuid` |  |
| `status` | `varchar` |  |
| `notes` | `text` |  Nullable |
| `total_taxable_value` | `numeric` |  Nullable |
| `total_gst_value` | `numeric` |  Nullable |
| `total_amount` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  |
| `accepted_at` | `timestamptz` |  Nullable |

## Table `purchase_request_items`

Line items within a vendor purchase request

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pr_id` | `uuid` |  |
| `item_name` | `varchar` |  |
| `hsn_code` | `varchar` |  Nullable |
| `unit_price` | `numeric` |  |
| `gst_rate` | `numeric` |  |
| `quantity` | `int4` |  |
| `taxable_value` | `numeric` |  |
| `gst_amount` | `numeric` |  |
| `total_amount` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## RLS Policies

### `organizations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow org lookup` | SELECT | public | PERMISSIVE | `true` | — |
| `org_insert_authenticated` | INSERT | public | PERMISSIVE | — | `(auth.uid() IS NOT NULL)` |
| `org_select_own` | SELECT | public | PERMISSIVE | `(id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs))` | — |
| `org_update_admin` | UPDATE | public | PERMISSIVE | `(id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs   WHERE (current_user_orgs.role = 'org_admin'::text)))` | — |

### `organization_users`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `org_users_insert_admin` | INSERT | public | PERMISSIVE | — | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs   WHERE (current_user_orgs.role = 'org_admin'::text)))` |
| `org_users_select` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs))` | — |
| `org_users_update_admin` | UPDATE | public | PERMISSIVE | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs   WHERE (current_user_orgs.role = 'org_admin'::text)))` | — |

### `items_master`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `items_insert_procurement` | INSERT | public | PERMISSIVE | — | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs   WHERE (current_user_orgs.role = ANY (ARRAY['org_admin'::text, 'procurement'::text]))))` |
| `items_select_org` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs))` | — |
| `items_update_procurement` | UPDATE | public | PERMISSIVE | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs   WHERE (current_user_orgs.role = ANY (ARRAY['org_admin'::text, 'procurement'::text]))))` | — |

### `purchase_orders`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow org members to insert POs` | INSERT | public | PERMISSIVE | — | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE ((organization_users.user_id = auth.uid()) AND (organization_users.status = 'active'::text))))` |
| `Allow org members to read POs` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE ((organization_users.user_id = auth.uid()) AND (organization_users.status = 'active'::text))))` | — |
| `Vendors can update PO status` | UPDATE | public | PERMISSIVE | `((org_id IN ( SELECT vendor_org_links.org_id    FROM vendor_org_links   WHERE (vendor_org_links.vendor_id IN ( SELECT vendors.id            FROM vendors           WHERE (vendors.user_id = auth.uid()))))) OR (supplier_name ~~* (('%'::text \|\| ( SELECT vendors.company_name    FROM vendors   WHERE (vendors.user_id = auth.uid())  LIMIT 1)) \|\| '%'::text)))` | — |
| `Vendors can view their org POs` | SELECT | public | PERMISSIVE | `((org_id IN ( SELECT vendors.org_id    FROM vendors   WHERE ((vendors.user_id = auth.uid()) AND (vendors.org_id IS NOT NULL)))) OR (supplier_name ~~* (('%'::text \|\| ( SELECT vendors.company_name    FROM vendors   WHERE (vendors.user_id = auth.uid())  LIMIT 1)) \|\| '%'::text)))` | — |
| `po_insert` | INSERT | public | PERMISSIVE | — | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs   WHERE (current_user_orgs.role = ANY (ARRAY['org_admin'::text, 'procurement'::text]))))` |
| `po_select` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs   WHERE (current_user_orgs.role = ANY (ARRAY['org_admin'::text, 'procurement'::text, 'finance'::text]))))` | — |
| `po_update` | UPDATE | public | PERMISSIVE | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs   WHERE (current_user_orgs.role = ANY (ARRAY['org_admin'::text, 'procurement'::text]))))` | — |

### `purchase_order_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable read for authenticated on purchase_order_items` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Vendors can view PO items` | SELECT | public | PERMISSIVE | `(po_id IN ( SELECT purchase_orders.id    FROM purchase_orders   WHERE ((purchase_orders.org_id IN ( SELECT vendor_org_links.org_id            FROM vendor_org_links           WHERE (vendor_org_links.vendor_id IN ( SELECT vendors.id                    FROM vendors                   WHERE (vendors.user_id = auth.uid()))))) OR (purchase_orders.supplier_name ~~* (('%'::text \|\| ( SELECT vendors.company_name            FROM vendors           WHERE (vendors.user_id = auth.uid())          LIMIT 1)) \|\| '%'::text)))))` | — |
| `po_items_insert` | INSERT | public | PERMISSIVE | — | `(po_id IN ( SELECT purchase_orders.id    FROM purchase_orders   WHERE (purchase_orders.org_id IN ( SELECT current_user_orgs.org_id            FROM current_user_orgs           WHERE (current_user_orgs.role = ANY (ARRAY['org_admin'::text, 'procurement'::text]))))))` |
| `po_items_select` | SELECT | public | PERMISSIVE | `(po_id IN ( SELECT purchase_orders.id    FROM purchase_orders   WHERE (purchase_orders.org_id IN ( SELECT current_user_orgs.org_id            FROM current_user_orgs))))` | — |
| `po_items_update` | UPDATE | public | PERMISSIVE | `(po_id IN ( SELECT purchase_orders.id    FROM purchase_orders   WHERE (purchase_orders.org_id IN ( SELECT current_user_orgs.org_id            FROM current_user_orgs           WHERE (current_user_orgs.role = ANY (ARRAY['org_admin'::text, 'procurement'::text]))))))` | — |

### `grns`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow org members to insert GRNs` | INSERT | public | PERMISSIVE | — | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE ((organization_users.user_id = auth.uid()) AND (organization_users.status = 'active'::text))))` |
| `Allow org members to read GRNs` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE ((organization_users.user_id = auth.uid()) AND (organization_users.status = 'active'::text))))` | — |
| `Vendors can view linked GRNs` | SELECT | public | PERMISSIVE | `(po_id IN ( SELECT purchase_orders.id    FROM purchase_orders   WHERE ((purchase_orders.org_id IN ( SELECT vendor_org_links.org_id            FROM vendor_org_links           WHERE (vendor_org_links.vendor_id IN ( SELECT vendors.id                    FROM vendors                   WHERE (vendors.user_id = auth.uid()))))) OR (purchase_orders.supplier_name ~~* (('%'::text \|\| ( SELECT vendors.company_name            FROM vendors           WHERE (vendors.user_id = auth.uid())          LIMIT 1)) \|\| '%'::text)))))` | — |
| `grn_insert` | INSERT | public | PERMISSIVE | — | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs))` |
| `grn_select` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs))` | — |

### `grn_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert for authenticated users on grn_items` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Enable read for authenticated on grn_items` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `grn_items_select` | SELECT | public | PERMISSIVE | `(grn_id IN ( SELECT grns.id    FROM grns   WHERE (grns.org_id IN ( SELECT current_user_orgs.org_id            FROM current_user_orgs))))` | — |

### `invoices`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow org members to insert invoices` | INSERT | public | PERMISSIVE | — | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE ((organization_users.user_id = auth.uid()) AND (organization_users.status = 'active'::text))))` |
| `Allow org members to read invoices` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE ((organization_users.user_id = auth.uid()) AND (organization_users.status = 'active'::text))))` | — |
| `Buyers can update org invoices` | UPDATE | public | PERMISSIVE | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE (organization_users.user_id = auth.uid())))` | — |
| `Buyers can view org invoices` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE (organization_users.user_id = auth.uid())))` | — |
| `Vendors can insert invoices` | INSERT | public | PERMISSIVE | — | `((org_id IN ( SELECT vendor_org_links.org_id    FROM vendor_org_links   WHERE (vendor_org_links.vendor_id IN ( SELECT vendors.id            FROM vendors           WHERE (vendors.user_id = auth.uid()))))) OR (supplier_name ~~* (('%'::text \|\| ( SELECT vendors.company_name    FROM vendors   WHERE (vendors.user_id = auth.uid())  LIMIT 1)) \|\| '%'::text)))` |
| `Vendors can view their org invoices` | SELECT | public | PERMISSIVE | `((org_id IN ( SELECT vendors.org_id    FROM vendors   WHERE ((vendors.user_id = auth.uid()) AND (vendors.org_id IS NOT NULL)))) OR (supplier_name ~~* (('%'::text \|\| ( SELECT vendors.company_name    FROM vendors   WHERE (vendors.user_id = auth.uid())  LIMIT 1)) \|\| '%'::text)))` | — |
| `invoice_insert` | INSERT | public | PERMISSIVE | — | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs   WHERE (current_user_orgs.role = ANY (ARRAY['org_admin'::text, 'finance'::text]))))` |
| `invoice_select` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs   WHERE (current_user_orgs.role = ANY (ARRAY['org_admin'::text, 'finance'::text]))))` | — |

### `invoice_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Buyers can view org invoice items` | SELECT | public | PERMISSIVE | `(invoice_id IN ( SELECT invoices.id    FROM invoices   WHERE (invoices.org_id IN ( SELECT organization_users.org_id            FROM organization_users           WHERE (organization_users.user_id = auth.uid())))))` | — |
| `Enable read for authenticated on invoice_items` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Vendors can insert invoice items` | INSERT | public | PERMISSIVE | — | `(invoice_id IN ( SELECT invoices.id    FROM invoices   WHERE ((invoices.org_id IN ( SELECT vendor_org_links.org_id            FROM vendor_org_links           WHERE (vendor_org_links.vendor_id IN ( SELECT vendors.id                    FROM vendors                   WHERE (vendors.user_id = auth.uid()))))) OR (invoices.supplier_name ~~* (('%'::text \|\| ( SELECT vendors.company_name            FROM vendors           WHERE (vendors.user_id = auth.uid())          LIMIT 1)) \|\| '%'::text)))))` |
| `invoice_items_select` | SELECT | public | PERMISSIVE | `(invoice_id IN ( SELECT invoices.id    FROM invoices   WHERE (invoices.org_id IN ( SELECT current_user_orgs.org_id            FROM current_user_orgs))))` | — |

### `audit_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow org members to insert audit_logs` | INSERT | public | PERMISSIVE | — | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE ((organization_users.user_id = auth.uid()) AND (organization_users.status = 'active'::text))))` |
| `Allow org members to read audit_logs` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE ((organization_users.user_id = auth.uid()) AND (organization_users.status = 'active'::text))))` | — |
| `audit_insert` | INSERT | public | PERMISSIVE | — | `(auth.uid() IS NOT NULL)` |
| `audit_select` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT current_user_orgs.org_id    FROM current_user_orgs))` | — |

### `payments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow insert payments` | INSERT | public | PERMISSIVE | — | `true` |
| `Allow read payments` | SELECT | public | PERMISSIVE | `true` | — |
| `Allow update payments` | UPDATE | public | PERMISSIVE | `true` | — |

### `fraud_assessments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Org users can view fraud assessments` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM organization_users ou   WHERE ((ou.org_id = fraud_assessments.org_id) AND (ou.user_id = auth.uid()))))` | — |

### `purchase_request_items`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Enable insert for authenticated on purchase_request_items` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `Enable read for authenticated on purchase_request_items` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Orgs can insert PR items` | INSERT | public | PERMISSIVE | — | `(pr_id IN ( SELECT purchase_requests.id    FROM purchase_requests   WHERE (purchase_requests.org_id IN ( SELECT organization_users.org_id            FROM organization_users           WHERE (organization_users.user_id = auth.uid())))))` |

### `purchase_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Org users can update PR status` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM organization_users ou   WHERE ((ou.org_id = purchase_requests.org_id) AND (ou.user_id = auth.uid()))))` | — |
| `Org users can view PRs for their org` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM organization_users ou   WHERE ((ou.org_id = purchase_requests.org_id) AND (ou.user_id = auth.uid()))))` | — |
| `Orgs can insert PRs` | INSERT | public | PERMISSIVE | — | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE (organization_users.user_id = auth.uid())))` |
| `Orgs can view their PRs` | SELECT | public | PERMISSIVE | `(org_id IN ( SELECT organization_users.org_id    FROM organization_users   WHERE (organization_users.user_id = auth.uid())))` | — |
| `Vendors can create PRs` | INSERT | public | PERMISSIVE | — | `(vendor_id IN ( SELECT vendors.id    FROM vendors   WHERE (vendors.user_id = auth.uid())))` |
| `Vendors can update assigned PRs` | UPDATE | public | PERMISSIVE | `(vendor_id IN ( SELECT vendors.id    FROM vendors   WHERE (vendors.user_id = auth.uid())))` | — |
| `Vendors can view assigned PRs` | SELECT | public | PERMISSIVE | `(vendor_id IN ( SELECT vendors.id    FROM vendors   WHERE (vendors.user_id = auth.uid())))` | — |

