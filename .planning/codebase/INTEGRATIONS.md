# External Integrations

## Database: Supabase (PostgreSQL)

**Primary integration.** Both frontends interact directly with Supabase using the JS SDK. There is no intermediate backend/API layer — all queries go client → Supabase.

### Key Tables

| Table | Purpose |
|---|---|
| `organizations` | Buyer organizations (legal_name, org_code) |
| `organization_users` | User ↔ Org mapping with role + status |
| `vendors` | Vendor company profiles (company_name, gstin, banking info) |
| `vendor_org_links` | Bridge table: vendor ↔ org many-to-many |
| `purchase_orders` | PO headers (po_number, supplier_name, status, amounts) |
| `purchase_order_items` | PO line items (item_name, qty, unit_price, tax) |
| `grns` | Goods Receipt Notes (grn_number, po_id, received_by) |
| `grn_items` | GRN line items (quantity_received, quantity_accepted) |
| `invoices` | Invoice headers (invoice_number, po_id, status, amounts) |
| `invoice_items` | Invoice line items (item_name, qty, price, gst) |
| `payments` | Payment records against invoices |
| `audit_logs` | Action tracking (entity_type, action, metadata) |
| `vendor_messages` | Vendor ↔ buyer messaging |

### Row Level Security (RLS)

RLS is enabled on all tables. Key policies:
- **vendors:** Users can CRUD their own profile; org users can view their org's vendors
- **purchase_orders:** Org users can manage POs; vendors need explicit UPDATE policy for accepting/rejecting
- **invoices:** Vendors need INSERT policy to submit invoices
- **invoice_items:** Vendors need INSERT policy to attach line items

> RLS is the #1 source of silent failures — updates return success but affect 0 rows if the policy doesn't match.

### Realtime Subscriptions

Used via `supabase.channel()` in:
- `VendorDashboard.jsx` — listens for PO, invoice, org changes
- `Payments.jsx` — listens for payment changes
- `ProcurementOverview.jsx` — listens for PO, invoice, GRN changes
- `InvoiceManagement.jsx` — listens for invoice changes

## Authentication: Supabase Auth

- Email/password authentication
- Session management via `supabase.auth.getSession()` and `onAuthStateChange()`
- **Buyer portal:** Uses `AuthContext.jsx` with React Context API + `ProtectedRoute` component
- **Vendor portal:** Uses session state directly in `App.jsx` (no context provider)

## ML Fraud Detection API: Flask

- Standalone Flask server at `model/api/app.py` on port 5000
- Single endpoint: `POST /predict` — accepts invoice features, returns fraud probability
- Model: XGBoost binary classifier (`xgboost_fraud_model.pkl`)
- CORS enabled for frontend access
- **Not yet integrated** into the frontend workflow (standalone API)

## External Services

- **No external payment gateways** — payments are tracked internally
- **No email/notification services** — notifications are in-app only (Supabase realtime)
- **No file storage** — invoice PDF uploads are stubbed (UI exists, storage not connected)
- **No CI/CD** — no GitHub Actions, Vercel, or similar configs detected
