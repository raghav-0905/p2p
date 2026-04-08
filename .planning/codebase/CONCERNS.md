# Technical Concerns & Debt

## 🔴 Critical Issues

### 1. MUI Version Mismatch Between Portals
- **Buyer portal:** MUI v7 (`@mui/material: ^7.3.7`)
- **Vendor portal:** MUI v9 (`@mui/material: ^9.0.0`)
- This causes API differences (e.g., `InputProps` vs `slotProps`, icon export names)
- Leads to subtle bugs when copying patterns between portals
- **Impact:** Build errors, development friction

### 2. Silent RLS Failures
- Supabase RLS policy rejections return `{ error: null }` with 0 rows affected
- Frontend shows "success" even when nothing was updated
- **Root cause:** Supabase design — RLS silently filters, doesn't error
- **Impact:** Status updates appear to succeed but don't persist
- **Mitigation needed:** Check returned row count or use `.select()` after `.update()`

### 3. No Server-Side Validation
- All business logic runs client-side
- Status transition validation is only in frontend code
- A malicious user could bypass the frontend and call Supabase directly
- **Impact:** Invalid state transitions possible (e.g., skip from "created" to "paid")
- **Mitigation:** Add database triggers or Supabase Edge Functions for validation

### 4. Hardcoded Status Strings
- Status values (`"created"`, `"acknowledged"`, `"approved"`, etc.) are hardcoded as string literals throughout the codebase
- No shared enum or constant file
- Easy to introduce typos or mismatches (we already had `"approved"` vs `"acknowledged"` bugs)
- **Impact:** Runtime errors, silent data mismatches

## 🟡 Moderate Concerns

### 5. No Shared Code Between Portals
- Both portals are fully independent with duplicated:
  - Dashboard components (`MetricTile`, `SectionCard`, etc.)
  - Supabase client setup
  - Status color/label mapping logic
- Changes in one portal don't propagate to the other
- **Impact:** Maintenance burden, divergent behavior

### 6. Mixed Authentication Patterns
- Buyer portal: `AuthContext` + `ProtectedRoute` (proper React patterns)
- Vendor portal: Session state in `App.jsx` (no context, no protected route component)
- Vendor portal checks `supabase.auth.getUser()` on every page load
- **Impact:** Inconsistent security posture, redundant API calls

### 7. Large Monolith Components
- `UserDashboard.jsx` — 570+ lines (metrics, PO tables, invoice tables, GRN tables, alerts, dispatch)
- `InvoiceManagement.jsx` — 630+ lines (list, submit dialog, detail dialog, line items)
- `POManagement.jsx` — 500+ lines (list, detail dialog, confirm dialog)
- **Impact:** Hard to maintain, hard to test, hard to review

### 8. No Audit Trail Implementation
- `ProcurementOverview.jsx` queries `audit_logs` table for dispatch tracking
- But no code actually *writes* to `audit_logs`
- Status transitions are not logged anywhere
- **Impact:** No accountability for who changed what and when

### 9. Bridge Table Naming Inconsistency
- SQL schema defines `vendor_organizations` (see `schema_updates_v2.sql`)
- Frontend code references `vendor_org_links` (see `vendorPo.js`)
- One of these doesn't match the actual Supabase table
- **Impact:** 404 errors or silent query failures for one path

## 🟢 Minor Issues

### 10. Console Logging in Production Code
- Extensive `console.log`, `console.warn`, `console.error` throughout `vendorPo.js`
- Useful for debugging but leaks internal details in production
- **Impact:** Information disclosure, noisy console

### 11. Placeholder Pages
- `ContractsPerformance.jsx` — Uses hardcoded static data (no database integration)
- `AdminDashboard.jsx` — 5-line stub component
- `Messaging.jsx` — Basic but functional; no real-time updates
- **Impact:** Incomplete features visible to users

### 12. Deprecated MUI APIs Still In Use
- `InputProps={{ readOnly: true }}` (should be `slotProps` in v9)
- `Grid item xs={2.4}` (fractional sizes not valid in some MUI versions)
- `primaryTypographyProps` on ListItemText
- **Impact:** Console warnings, future compatibility issues

### 13. File Overwrite Risk
- `VendorProfile.jsx` was previously overwritten with `vendorPo.js` library code
- No pre-commit hooks or file protection to prevent this
- **Impact:** Loss of working code without notice

## Security Concerns

### 14. Client-Side Authorization Only
- Role checking happens in React components (`ProtectedRoute`)
- Database RLS provides some protection, but business rules aren't enforced at DB level
- No Supabase Edge Functions or database triggers for validation

### 15. No Rate Limiting
- All Supabase calls go through the anon key
- No rate limiting on auth attempts or API calls
- **Impact:** Susceptible to brute force or abuse

### 16. Env Secrets in Client Bundle
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are exposed in the browser
- This is by design (anon key is meant to be public), but highlights reliance on RLS

## Performance Concerns

### 17. N+1 Query Patterns
- `enrichPOsWithOrganizations()` and `enrichInvoicesWithPONumbers()` make separate queries after initial fetch
- Dashboard components fetch all data on every mount (no caching)
- **Impact:** Slow page loads with large datasets

### 18. No Pagination
- All tables fetch full datasets (`select("*")` without `.range()`)
- With growing data, this will cause performance degradation
- **Impact:** Memory usage, slow renders
