# Code Conventions

## Component Patterns

### Function Components with `export default`
All React components use function declarations with `export default`:
```javascript
export default function POManagement() {
  // ...
}
```

### State Management
- **No global state library** (no Redux, Zustand, Jotai)
- Buyer portal: `AuthContext` for auth, everything else is local `useState`
- Vendor portal: All state is local `useState` per component
- Data fetching in `useEffect` with async IIFE or named async functions

### Supabase Query Pattern
Direct SDK calls inside components, no abstraction layer (except vendor portal's `vendorPo.js`):
```javascript
const { data, error } = await supabase
  .from("purchase_orders")
  .select("*")
  .eq("org_id", orgId)
  .order("created_at", { ascending: false });
```

### Dual-Path Fetching (Vendor Portal)
A unique pattern in `vendorPo.js` where data is fetched via two strategies and merged:
1. By `org_id` (via bridge table lookup)
2. By `supplier_name` (fuzzy ILIKE match)

Results are deduplicated by ID using a `Map`.

## Styling Patterns

### MUI `sx` Prop
Primary styling method — inline `sx` props on MUI components:
```javascript
<Box sx={{ p: 3, bgcolor: "#f8fafc", borderRadius: 2 }}>
```

### Theme Customization
- Buyer portal: Indigo-based theme in `theme/theme.js`
- Vendor portal: Salesforce Lightning-inspired theme defined inline in `App.jsx`

### Common Style Tokens
- Background: `#f8fafc` (light gray)
- Text primary: `#1e293b` or `#0f172a`
- Accent: `#4f46e5` (indigo, buyer) / `#0176d3` (blue, vendor)
- Border: `1px solid #e2e8f0` or `1px solid divider`
- Paper: `elevation={0}` with explicit border (flat design)

## Error Handling

### Frontend
- `try/catch` blocks around Supabase calls
- Errors logged to `console.error()`
- User feedback via MUI `Snackbar` + `Alert` components
- Some legacy pages still use `alert()` (e.g., old VendorProfile)

### No Server-Side Validation
- All validation is client-side
- Database constraints (CHECK, FK) are the only server-side guard
- RLS policies provide authorization (but failures are silent)

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Components | PascalCase | `POManagement`, `VendorDashboard` |
| Files (components) | PascalCase.jsx | `InvoiceManagement.jsx` |
| Files (utils) | camelCase.js | `vendorPo.js`, `supabase.js` |
| Functions | camelCase | `fetchVendorPurchaseOrders` |
| Database tables | snake_case | `purchase_orders`, `invoice_items` |
| Database columns | snake_case | `po_number`, `total_amount` |
| CSS classes | Not used (sx prop) | N/A |
| Env vars | SCREAMING_SNAKE | `VITE_SUPABASE_URL` |

## Import Order (Observed)
1. React imports (`useState`, `useEffect`, etc.)
2. Library imports (supabase, react-router-dom)
3. Local imports (lib functions, components)
4. MUI component imports
5. MUI icon imports
6. Animation imports (framer-motion)

## Framer Motion Usage
Used for page entrance animations:
```javascript
<Paper
  component={motion.div}
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
```

## Currency Formatting
Indian Rupee format used consistently:
```javascript
₹{Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
```
