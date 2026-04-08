# Architecture

## Overall Pattern

**Multi-portal SPA architecture** with a shared Supabase backend (no custom API layer).

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Buyer Portal    │    │  Vendor Portal   │    │  ML Flask API    │
│  (React/Vite)    │    │  (React/Vite)    │    │  (Python)        │
│  Port 5173       │    │  Port 5174       │    │  Port 5000       │
└────────┬─────────┘    └────────┬─────────┘    └──────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │  Supabase   │
              │  (Auth +    │
              │  PostgreSQL  │
              │  + Realtime) │
              └─────────────┘
```

## System Layers

### 1. Presentation Layer
- **Buyer Portal** (`frontend/`) — Organization employees (finance, procurement, admin, viewer)
- **Vendor Portal** (`vendor-frontend/`) — External suppliers/vendors
- Both are independent Vite SPAs that share NO code between them
- Each has its own Supabase client, theme, routing, and component library

### 2. Business Logic Layer
- Lives entirely in frontend code — **no backend API layer**
- Buyer portal: Logic in page components (e.g., `UserDashboard.jsx`, `ProcurementOverview.jsx`)
- Vendor portal: Extracted into `vendor-frontend/src/lib/vendorPo.js` as shared helper functions

### 3. Data Layer
- Supabase PostgreSQL accessed directly via the JS SDK
- RLS (Row Level Security) policies enforce authorization at the database level
- Schema managed through versioned `.sql` files in project root

### 4. ML Layer
- Standalone Flask API that loads a pre-trained XGBoost model
- Not yet wired into the main frontend workflow

## Authentication Architecture

### Buyer Portal
```
main.jsx → AuthProvider → BrowserRouter → App (Routes)
                              ↓
                    AuthContext (user, orgUser, loading)
                              ↓
                    ProtectedRoute (role check: org_admin/finance/procurement/viewer)
```
- `AuthContext.jsx` provides `user`, `orgUser`, `loading` via React Context
- `ProtectedRoute.jsx` checks role + status before rendering children

### Vendor Portal
```
App.jsx → Session check → Router → VendorLayout → Outlet (pages)
```
- No AuthContext — session managed directly in `App.jsx` state
- Guards in routing: `session ? <Component /> : <Navigate to="/login" />`

## Data Flow: PO Lifecycle

```
Buyer creates PO (status: "created")
      ↓
Vendor sees PO → Accepts (status: "acknowledged") or Rejects ("cancelled")
      ↓
Buyer creates GRN → PO status: "partially_received" or "fully_received"
      ↓
Vendor submits Invoice against PO → PO status: "invoiced"
      ↓
Finance reviews Invoice → "under_review" → "approved" → "paid"
      ↓
Payment closes PO → PO status: "closed"
```

## Multi-Tenancy Model

- **Organization-based:** Each buyer org has a UUID, users are linked via `organization_users`
- **Vendor multi-org:** Vendors link to multiple orgs via `vendor_org_links` bridge table
- Data isolation via RLS policies keyed on `org_id`
- Vendor data fetching uses dual-path strategy: org link match OR company_name match (fuzzy)

## Key Abstractions

### Shared Dashboard Components (`components/dashboard/`)
Both portals share identical component names (but separate copies):
- `MetricTile.jsx` — KPI card tiles
- `SectionCard.jsx` — Content section wrappers
- `DetailDrawer.jsx` — Slide-out detail panels
- `EmptyState.jsx` — Empty data placeholder
- `StatusPill.jsx` — Status badge chip

### Vendor Business Logic (`vendor-frontend/src/lib/vendorPo.js`)
Centralized functions for all vendor data operations:
- `getVendorLinkedOrgIds()` — Resolve org IDs via bridge table
- `fetchVendorPurchaseOrders()` — Dual-path PO fetch (org + name)
- `fetchVendorInvoices()` — Dual-path invoice fetch
- `enrichPOsWithOrganizations()` — Attach org names to POs
- `enrichInvoicesWithOrganizations()` — Attach org names to invoices
- `enrichInvoicesWithPONumbers()` — Attach PO numbers to invoices
- `updatePOStatus()` — Status transition with timestamp tracking
- `connectVendorToOrg()` — Multi-org vendor linking
