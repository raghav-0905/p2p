# Testing

## Current State

**No automated tests exist in the project.**

- No test files found in either frontend or the ML model
- No test runner configured (no Jest, Vitest, Cypress, Playwright)
- No `test` script in either `package.json`
- No CI/CD pipeline that would run tests

## Test Infrastructure

### Available but Unused
- **Vitest** could be added trivially (both frontends use Vite)
- **React Testing Library** is a natural fit for component tests
- **Playwright** or **Cypress** for E2E testing of the procurement workflow

### What Should Be Tested

#### Unit Tests (High Priority)
- `vendorPo.js` — Core business logic (status transitions, data enrichment, dual-path fetching)
- `AuthContext.jsx` — Authentication flow and role resolution
- `ProtectedRoute.jsx` — Role-based access control

#### Integration Tests (Medium Priority)
- PO lifecycle: create → acknowledge → GRN → invoice → pay → close
- Multi-org vendor linking and data visibility
- RLS policy verification (ensure vendors can't see other org's data)

#### E2E Tests (High Value)
- Full procurement workflow across both portals
- Vendor registration + multi-org connection
- Invoice submission with line items

## ML Model Testing

- `model/preprocessing/train_model.py` contains train/test split evaluation
- XGBoost model evaluated with accuracy, F1, ROC-AUC during training
- No automated regression tests for model predictions
- No API endpoint tests for `model/api/app.py`

## Manual Testing Pattern

Currently all testing is manual:
1. Run `npm run dev` on the relevant frontend
2. Interact with the UI in browser
3. Check Supabase dashboard for database state
4. Review browser console for errors

## Recommendations

1. Add Vitest for unit testing `vendorPo.js` helper functions
2. Add Playwright for E2E workflow testing (PO → Invoice lifecycle)
3. Add a simple test for the Flask `/predict` endpoint
4. Consider snapshot testing for dashboard components
