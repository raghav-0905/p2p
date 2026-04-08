# Project Structure

## Root Layout

```
p2p/
├── frontend/                    # Buyer/Employee portal (Vite + React)
├── vendor-frontend/             # Vendor/Supplier portal (Vite + React)
├── model/                       # ML fraud detection (Python)
├── .planning/                   # GSD planning docs
├── schema_updates.sql           # DB migration: vendors table + RLS
├── schema_updates_v2.sql        # DB migration: line items + vendor_organizations
├── schema_vendor_registration.sql # DB migration: vendor registration
├── README.md                    # Project documentation
├── TODO.md                      # Task tracking
└── .gitignore
```

## Buyer Portal (`frontend/`)

```
frontend/
├── package.json
├── vite.config.js
├── index.html
├── public/
└── src/
    ├── main.jsx                      # Entry point (ThemeProvider, AuthProvider, BrowserRouter)
    ├── App.jsx                       # Route definitions
    ├── App.css                       # Global styles
    ├── index.css                     # CSS reset + root styles
    ├── assets/
    ├── context/
    │   └── AuthContext.jsx           # Auth state provider (user, orgUser, loading)
    ├── lib/
    │   └── supabase.js              # Supabase client init (minimal)
    ├── theme/
    │   └── theme.js                 # MUI theme config
    ├── layouts/
    │   ├── AdminLayout.jsx          # Admin shell (placeholder)
    │   └── UserLayout.jsx           # User shell (placeholder)
    ├── components/
    │   ├── ProtectedRoute.jsx       # Role-based route guard
    │   └── dashboard/
    │       ├── MetricTile.jsx       # KPI metric card
    │       ├── SectionCard.jsx      # Content wrapper card
    │       ├── DetailDrawer.jsx     # Slide-out drawer
    │       ├── EmptyState.jsx       # Empty data state
    │       └── StatusPill.jsx       # Status chip
    └── pages/
        ├── Home.jsx                 # Landing page
        ├── auth/
        │   ├── SignIn.jsx           # Login page
        │   └── SignUp.jsx           # Registration (org code based)
        ├── admin/
        │   └── AdminDashboard.jsx   # Admin panel (stub)
        └── user/
            ├── UserDashboard.jsx    # Executive dashboard (POs, invoices, GRNs, analytics)
            ├── PurchaseOrderForm.jsx # Create PO with vendor picker + line items
            ├── GRNForm.jsx          # Create GRN against a PO
            ├── ProcurementOverview.jsx # Tabbed view of all POs/GRNs/Invoices
            └── AnalyticsDashboard.jsx  # Charts (Recharts) for spend analytics
```

## Vendor Portal (`vendor-frontend/`)

```
vendor-frontend/
├── package.json
├── vite.config.js
├── index.html
├── public/
└── src/
    ├── main.jsx                      # Entry point (React root render only)
    ├── App.jsx                       # Theme + Router + Auth guard + Route definitions
    ├── App.css
    ├── index.css
    ├── assets/
    ├── lib/
    │   ├── supabase.js              # Supabase client init (with env validation)
    │   └── vendorPo.js              # Core business logic (PO/Invoice fetch, status updates)
    ├── layouts/
    │   └── VendorLayout.jsx         # Sidebar nav + AppBar + notification dropdown
    ├── components/
    │   └── dashboard/
    │       ├── MetricTile.jsx       # KPI metric card
    │       ├── SectionCard.jsx      # Content wrapper card
    │       ├── DetailDrawer.jsx     # Slide-out drawer
    │       ├── EmptyState.jsx       # Empty data state
    │       └── StatusPill.jsx       # Status chip
    └── pages/
        ├── auth/
        │   ├── Login.jsx            # Vendor login
        │   └── Register.jsx         # Vendor registration (multi-org selection)
        ├── VendorDashboard.jsx      # Dashboard with metrics, alerts, org connections
        ├── POManagement.jsx         # View/Accept/Reject POs
        ├── InvoiceManagement.jsx    # Submit invoices with line items
        ├── Payments.jsx             # View payment status
        ├── VendorProfile.jsx        # Edit company/tax/banking info
        ├── ContractsPerformance.jsx # Compliance docs + scorecard (static data)
        └── Messaging.jsx           # Send/receive messages
```

## ML Model (`model/`)

```
model/
├── requirements.txt                  # Python dependencies
├── api/
│   └── app.py                       # Flask REST API (/predict endpoint)
├── preprocessing/
│   ├── preprocess.py                # Feature engineering pipeline
│   ├── train_model.py               # XGBoost training script
│   ├── invoices.csv                  # Raw invoice data
│   ├── behavioural_features.csv      # Behavioral features
│   ├── labels.csv                    # Fraud labels
│   └── final_training_dataset*.csv   # Processed datasets
└── trained_models/
    └── xgboost_fraud_model.pkl       # Serialized trained model
```

## Key Naming Conventions

- **Pages:** PascalCase, descriptive (`POManagement.jsx`, `InvoiceManagement.jsx`)
- **Lib files:** camelCase (`vendorPo.js`, `supabase.js`)
- **Components:** PascalCase in `components/dashboard/`
- **SQL files:** snake_case with version suffix (`schema_updates_v2.sql`)
- **Supabase tables:** snake_case (`purchase_orders`, `invoice_items`)

## Routes

### Buyer Portal
| Path | Component | Roles |
|---|---|---|
| `/` | Home | Public |
| `/signin` | SignIn | Public |
| `/signup` | SignUp | Public |
| `/admin` | AdminDashboard | org_admin |
| `/user` | UserDashboard | finance, procurement, viewer |
| `/purchase-order` | PurchaseOrderForm | finance, procurement |
| `/grn` | GRNForm | finance, procurement |
| `/analytics` | AnalyticsDashboard | finance, procurement, viewer |
| `/procurement` | ProcurementOverview | finance, procurement, viewer |

### Vendor Portal
| Path | Component |
|---|---|
| `/login` | Login |
| `/register` | Register |
| `/dashboard` | VendorDashboard |
| `/purchase-orders` | POManagement |
| `/invoices` | InvoiceManagement |
| `/payments` | Payments |
| `/profile` | VendorProfile |
| `/contracts` | ContractsPerformance |
| `/messages` | Messaging |
