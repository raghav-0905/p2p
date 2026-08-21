# P2P OrgNet – API Documentation

This document describes the primary backend APIs that handle the validation, scoring, and embedding workflows in this project.

---

## 1. Validation Backend Service (Port: 3001)
This Node.js/Express service contains the core business logic requiring administrative database access.

### `POST /api/validate/grn-match`
**Description**: Performs a 3-way match automatically after a Goods Receipt Note (GRN) is created. If an `invoice_id` is passed, it triggers the ML scoring automatically.
**Request Body**:
```json
{
  "org_id": "uuid",
  "po_id": "uuid",
  "grn_id": "uuid",
  "invoice_id": "uuid" (optional)
}
```
**Response**:
```json
{
  "success": true,
  "match_status": "matched | mismatched",
  "message": "..."
}
```

### `POST /api/validate/score-invoice`
**Description**: Triggers the Python ML service to score an invoice for fraud probability. It also attempts a 3-way match immediately after scoring if a PO exists.
**Request Body**:
```json
{
  "org_id": "uuid",
  "invoice_id": "uuid"
}
```

### `POST /api/validate/score-vendors`
**Description**: Batch operation intended for a CRON job. Iterates through all vendors, calculates their average fraud risk based on previous `fraud_assessments`, and updates the `risk_score` on the `vendors` table.

### `GET /api/validate/assessments/:orgId`
**Description**: Retrieves the fraud assessments for a given organization to display in the dashboard.

### `POST /api/validate/validate-po-closure`
**Description**: Validates if a Purchase Order is fully paid and can be marked as closed.
**Request Body**:
```json
{
  "po_id": "uuid"
}
```

---

## 2. ML Fraud Detection Service (Port: 5000)
This Python/Flask service predicts fraud using a pre-trained XGBoost model.

### `POST /predict`
**Description**: Evaluates a financial document payload for fraud.
**Request Body**:
```json
{
  "total_amount": 5000,
  "invoice_date": "2024-03-12",
  "supplier_id": "uuid",
  ... (other tabular features)
}
```
**Response**:
```json
{
  "fraud_probability": 0.85,
  "is_fraud": 1,
  "feature_contributions": {
    "total_amount": 0.4,
    "invoice_month": -0.1
    ...
  }
}
```

---

## 3. Embedding Polling Service (Port: 4000)
This Node.js service polls Supabase and manages Pinecone vector search.

### `POST /search`
**Description**: Performs a semantic search against the Pinecone vector database using the local `@xenova/transformers` model.
**Request Body**:
```json
{
  "org_id": "uuid",
  "query_text": "Looking for the high value invoice from TechCorp",
  "table": "invoices", (optional)
  "top_k": 5 (optional, default 5)
}
```
**Response**:
Returns the raw array of Pinecone results mapped to their `metadata`.
