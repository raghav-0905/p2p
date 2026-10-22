# 🚀 P2P Autonomous Agentic Enterprise Procurement & Finance System

A modern, enterprise-grade **Peer-to-Peer (P2P) Autonomous Agentic Command Center** built with **React + Vite**, an **Express.js backend**, **GroqCloud LPU (High-Speed LLM Inference)**, and **Supabase (PostgreSQL + Auth)** for secure, role-based procurement operations.

---

## ✨ Key Features & Architecture

### 🤖 1. Specialized 9-Agent AI Fleet (9 / 9 Active)
The system orchestrates a sequential multi-agent verification pipeline powered by **GroqCloud LLM Inference (`openai/gpt-oss-120b`)**:

| Agent | Name | Role & Verification Engine |
|-------|------|----------------------------|
| **Step 1** | **Document / Ingestion** | Schema verification, JSON extraction & payload normalization |
| **Step 2** | **Invoice Validation** | Completeness, GSTIN validation, mathematical integrity, off-hours checks |
| **Step 3** | **PO Validation** | Budget allocation, PO cap verification, line-item tolerance limits |
| **Step 4** | **3-Way Matching** | Line-item quantities & unit rates reconciliation across PO, GRN, and Invoice |
| **Step 5** | **Anomaly Detection** | Outlier detection, historical vendor spend deviation, ML fraud score |
| **Step 6** | **Vendor Intelligence** | Vendor risk scoring, bank account alteration tracking, dispute history |
| **Step 7** | **Compliance & Policy** | Procurement SOP compliance (thresholds, approvals, governance) |
| **Step 8** | **Approval / Decision** | Consensus synthesis of all upstream agents into a final recommendation |
| **Step 9** | **Notification / Escalation**| Event routing, audit log storage, high-priority notifications |

---

### 🛡️ 2. Autonomous Action & Human Intervention Engine

Once the 9-Agent Pipeline completes evaluation:

- **High-Certainty Decisions (Accept / Reject)**:
  - **Certain Accept (100% Verified)**: Displays high-certainty consensus with an interactive prompt: **"Authorize AI to Auto-Approve"**. Clicking this executes the status change to `approved` directly on the database/ledger and logs an immutable audit event.
  - **Certain Reject (Critical Breach / Fraud > 0.85)**: Prompts: **"Authorize AI to Auto-Reject & Freeze"**, automatically recording `rejected` & freezing payments.
  - Users can also choose **"Inspect in Invoice Page →"** for manual inspection.
- **Human Intervention Required**:
  - When audit discrepancies, budget overruns, or policy variance thresholds are detected, the system displays: **`Human Intervention Required`**.
  - A 1-click action button **"Review in Invoice Review & Authorize →"** immediately redirects to `/invoice` and automatically pops open the itemized **Invoice Review Modal** with complete line items, rates, taxes, and PO details.

---

### 🧭 3. Dedicated Route Architecture

| Route | Role / Purpose | Access |
|-------|----------------|--------|
| `/` | Enterprise Landing Page | Public |
| `/signin` | Supabase Email & Password Authentication | Public |
| `/signup` | Admin-Controlled Organization Code Onboarding | Public |
| `/user` | **Procurement & Finance Operations Overview**: Spend KPIs (MTD/YTD), PR Tracker, Spend Distribution, Alerts & Exceptions, Recent Activities | Authenticated (`finance`, `procurement`, `viewer`) |
| `/agent-fleet` | **Autonomous Agent Command Center**: 3x3 Architecture Grid, Sequential Data-Flow Visualizer, Live Groq Telemetry Stream, Decision Synthesis Card | Authenticated / Team |
| `/invoice` | **Invoice Review & Line-Item Management**: Auto-opens invoice modal from agent recommendations | Authenticated |
| `/purchase-requests`| PR Lifecycle Creation & Tracking | Authenticated |
| `/purchase-order`| Purchase Order Generator & Budget Cap Management | Authenticated |
| `/grn` | Goods Receipt Note (GRN) Ingestion & Quantity Receipt | Authenticated |
| `/analytics` | Spend & Operational Analytics Dashboard | Authenticated |
| `/admin` | Organization Administration & User Management | Admin (`org_admin`) |

---

## 🧰 Tech Stack

- **Frontend**:
  - React 19 + Vite
  - React Router v7
  - Material UI (MUI v7) + Emotion
  - Recharts (Spend trends & Category analytics)
  - Framer Motion (Transitions & animations)
- **Backend**:
  - Node.js (ES Modules) + Express.js
  - GroqCloud SDK / OpenAI-compatible API (`openai/gpt-oss-120b`)
  - Supabase JS Client (`@supabase/supabase-js`)
- **Database & Auth**:
  - Supabase (PostgreSQL with RLS)
  - Supabase GoTrue Auth

---

## 🏁 How to Start the Project

Follow these steps to run the complete system locally.

### 📋 Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Supabase Project**: (URL and Anon/Service Keys)
- **Groq API Key**: (From [console.groq.com](https://console.groq.com))

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/raghav-0905/p2p.git
cd p2p
```

---

### Step 2: Configure Environment Variables

#### 1. Frontend Environment (`frontend/.env`)
Create a `.env` file inside `frontend/` (or verify existing `frontend/.env`):
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 2. Backend Environment (`backend/.env`)
Create a `.env` file inside `backend/` (or verify existing `backend/.env`):
```env
PORT=3001
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# GroqCloud LLM Inference Configuration
LLM_PROVIDER=groq
LLM_API_KEY=your_groq_api_key_here
LLM_MODEL=openai/gpt-oss-120b
```

---

### Step 3: Install Dependencies

#### Install Frontend Dependencies:
```bash
cd frontend
npm install
cd ..
```

#### Install Backend Dependencies:
```bash
cd backend
npm install
cd ..
```

---

### Step 4: Run the Development Servers

Open two terminal windows:

#### Terminal 1 — Start the Backend Server (Express + Groq Orchestrator):
```bash
cd backend
npm run dev
```
> Express backend will start on **`http://localhost:3001`**.

#### Terminal 2 — Start the Frontend Application (Vite):
```bash
cd frontend
npm run dev
```
> Vite frontend will start on **`http://localhost:5173`**.

---

## 🌐 Navigating the Application

1. Open `http://localhost:5173` in your browser.
2. Sign in or sign up with your organization code.
3. **Procurement Operations Dashboard**: Automatically lands on `http://localhost:5173/user`.
4. **Autonomous Agent Command Center**: Click the **"Autonomous Fleet"** button in the top navigation bar or navigate directly to `http://localhost:5173/agent-fleet`.
5. Select a **Preset Scenario** or a **Live DB Invoice** and click **"Run 9-Agent Pipeline"**.
6. View the live telemetry stream from Groq and choose **Auto-Execute** or **Review in Invoice Page**.

---

## 🏢 Database Schema Overview (Supabase PostgreSQL)

- **`organizations`**: Legal entities with unique admin-controlled `org_code`.
- **`organization_users`**: Role mapping (`org_admin`, `finance`, `procurement`, `viewer`).
- **`invoices`**: Supplier invoices, GSTIN, PO links, amounts, and statuses (`submitted`, `under_review`, `approved`, `rejected`, `paid`).
- **`invoice_items`**: Line items with rates, quantities, taxable values, and GST amounts.
- **`purchase_orders`**: PO records, budget limits, line items, and approval states.
- **`purchase_requests`**: PR lifecycle entries tracking requisitions.
- **`grns`**: Goods Receipt Notes with received quantities and timestamps.
- **`payments`**: Payment execution records and dues.
- **`fraud_assessments`**: ML anomaly and 3-way match audit results.
- **`vendors`**: Supplier reliability profiles and bank details.
- **`agent_run_logs`**: Full audit telemetry logs persisted after each pipeline run.

---

## 📄 License
MIT License. Built for advanced autonomous procurement workflows.
