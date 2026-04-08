# Technology Stack

## Languages & Runtimes

- **JavaScript (ES2022+)** — Primary language across both frontends
- **Python 3.x** — ML model training + Flask API server
- **SQL (PostgreSQL)** — Database via Supabase, schema managed through `.sql` migration files

## Frontend Frameworks

### Buyer Portal (`frontend/`)
| Dependency | Version | Purpose |
|---|---|---|
| React | ^19.2.0 | UI framework |
| Vite | ^7.2.4 | Build tool + dev server |
| MUI (Material UI) | ^7.3.7 | Component library |
| @mui/icons-material | ^7.3.7 | Icon set |
| @emotion/react | ^11.14.0 | CSS-in-JS (MUI peer dep) |
| @emotion/styled | ^11.14.1 | CSS-in-JS (MUI peer dep) |
| React Router DOM | ^7.13.0 | Client-side routing |
| @supabase/supabase-js | ^2.95.3 | Supabase SDK (auth + DB) |
| framer-motion | ^12.33.0 | Animations |
| react-hook-form | ^7.71.1 | Form handling |
| recharts | ^3.8.0 | Data visualization charts |

### Vendor Portal (`vendor-frontend/`)
| Dependency | Version | Purpose |
|---|---|---|
| React | ^19.2.4 | UI framework |
| Vite | ^8.0.4 | Build tool + dev server |
| MUI (Material UI) | ^9.0.0 | Component library |
| @mui/icons-material | ^9.0.0 | Icon set |
| @emotion/react | ^11.14.0 | CSS-in-JS |
| @emotion/styled | ^11.14.1 | CSS-in-JS |
| React Router DOM | ^7.14.0 | Client-side routing |
| @supabase/supabase-js | ^2.102.1 | Supabase SDK |
| framer-motion | ^12.38.0 | Animations |
| react-hook-form | ^7.72.1 | Form handling |
| recharts | ^3.8.1 | Data visualization |

> **⚠️ Version Mismatch:** The buyer portal uses MUI v7, while the vendor portal uses MUI v9. This causes API differences (e.g., `InputProps` vs `slotProps`) and icon name differences.

### ML Model (`model/`)
| Dependency | Purpose |
|---|---|
| pandas | Data manipulation |
| numpy | Numerical computation |
| scikit-learn | ML utilities, preprocessing |
| xgboost | Fraud detection model |
| pyarrow | Parquet file support |
| flask | REST API server |
| flask-cors | CORS middleware |

## Build & Dev Tools

- **Vite** — Dev server + production bundler for both frontends
- **ESLint** — Linting (with react-hooks and react-refresh plugins)
- Both frontends use `"type": "module"` (ES modules)

## Configuration

- **Environment variables** via `.env.local` files (Vite's `import.meta.env`):
  - `VITE_SUPABASE_URL` — Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key
- Each frontend has its own `.env.local` (buyer on port 5173, vendor on port 5174)
- No shared monorepo tooling (no Nx, Turborepo, etc.)
- SQL schema changes are tracked as standalone `.sql` files in the project root

## Dev Server Ports
- Buyer frontend: `http://localhost:5173` (Vite default)
- Vendor frontend: `http://localhost:5174`
- ML API: `http://localhost:5000` (Flask)
