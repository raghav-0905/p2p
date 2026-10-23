# 🚀 Deployment Strategy — Render + Supabase

Simple deployment guide. Three services on Render, database already on Supabase.

---

## What Gets Deployed Where

| Service | Platform | Render Type | URL After Deploy |
|---------|----------|-------------|-----------------|
| **Buyer Frontend** | Render | Static Site | `https://p2p-frontend.onrender.com` |
| **Vendor Frontend** | Render | Static Site | `https://p2p-vendor.onrender.com` |
| **Backend (Express + AI Agents)** | Render | Web Service | `https://p2p-backend.onrender.com` |
| **Database + Auth** | Supabase | Already hosted | `https://gairpriyilzwijunhusu.supabase.co` |

> ML Model and Embedding Service are **not deployed** — the AI agent pipeline uses GroqCloud API directly.

---

## Step 1: Deploy the Backend

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo (`raghav-0905/p2p`)
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `p2p-backend` |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node src/index.js` |
| **Plan** | Free (or Starter) |

4. Add these **Environment Variables** in Render dashboard:

| Key | Value |
|-----|-------|
| `PORT` | `3001` |
| `SUPABASE_URL` | `https://gairpriyilzwijunhusu.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(your service role key from Supabase → Settings → API)* |
| `LLM_PROVIDER` | `groq` |
| `LLM_API_KEY` | *(your Groq API key — `gsk_...`)* |
| `LLM_MODEL` | `llama-3.3-70b-versatile` |

5. Click **Deploy**. Wait for it to go live.
6. Copy your backend URL (e.g. `https://p2p-backend.onrender.com`). You'll need it next.

---

## Step 2: Deploy the Buyer Frontend

1. Go to Render → **New** → **Static Site**
2. Connect the same GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `p2p-frontend` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. Add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://gairpriyilzwijunhusu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(your Supabase anon key)* |
| `VITE_API_URL` | `https://p2p-backend.onrender.com` *(the URL from Step 1)* |

5. Click **Deploy**.

> **Important:** Add a **Rewrite Rule** so React Router works:
> - Source: `/*`  →  Destination: `/index.html`  →  Action: **Rewrite**
>
> This is in Render → your static site → **Redirects/Rewrites** tab.

---

## Step 3: Deploy the Vendor Frontend

Same process as Step 2:

1. Render → **New** → **Static Site**
2. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `p2p-vendor` |
| **Root Directory** | `vendor-frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

3. Add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://gairpriyilzwijunhusu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(your Supabase anon key)* |
| `VITE_API_URL` | `https://p2p-backend.onrender.com` *(same backend URL)* |

4. Add the same **Rewrite Rule**: `/*` → `/index.html` → Rewrite
5. Click **Deploy**.

---

## Step 4: Enable CORS on Backend

The backend already uses `cors()` middleware (open to all origins), so it should work out of the box. If you face issues, you can restrict it later in `backend/src/index.js`:

```javascript
app.use(cors({
  origin: [
    'https://p2p-frontend.onrender.com',
    'https://p2p-vendor.onrender.com',
    'http://localhost:5173',
    'http://localhost:5174'
  ]
}));
```

---

## That's It — Verify Everything Works

Once all three are deployed:

- [ ] Open `https://p2p-frontend.onrender.com` → sign in works (Supabase Auth)
- [ ] Open `https://p2p-vendor.onrender.com` → vendor login works
- [ ] Go to Agent Fleet page → run pipeline → backend responds with AI agent results
- [ ] GRN submission triggers 3-way matching via backend
- [ ] Invoice review works end-to-end

---

## Code Changes Made (Hardcoded URLs → Env Vars)

The following files had `http://localhost:3001` hardcoded and have been fixed to use `VITE_API_URL`:

| File | What Was Fixed |
|------|---------------|
| `frontend/src/pages/user/InvoiceReview.jsx` (line 248) | PO closure validation call |
| `frontend/src/pages/user/GRNForm.jsx` (line 228) | GRN 3-way matching call |
| `frontend/src/components/agent-fleet/AgentFleetDashboard.jsx` (line 564) | Agent pipeline call |
| `vendor-frontend/src/pages/InvoiceManagement.jsx` (line 208) | Fraud assessment call |

All now use:
```javascript
`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/...`
```

- **Local dev**: works exactly as before (falls back to `localhost:3001`)
- **Production**: uses the Render backend URL from `VITE_API_URL`

---

## Local Development (Unchanged)

Nothing changes for local dev. Just run:

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Buyer Frontend
cd frontend
npm install
npm run dev

# Terminal 3 — Vendor Frontend (optional)
cd vendor-frontend
npm install
npm run dev
```

No `.env` changes needed locally — the fallback `http://localhost:3001` kicks in automatically.

---

## Environment Variables Summary

### Backend (`backend/.env` or Render env vars)
```env
PORT=3001
SUPABASE_URL=https://gairpriyilzwijunhusu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
LLM_PROVIDER=groq
LLM_API_KEY=<your_groq_api_key>
LLM_MODEL=llama-3.3-70b-versatile
```

### Buyer Frontend (Render env vars)
```env
VITE_SUPABASE_URL=https://gairpriyilzwijunhusu.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
VITE_API_URL=https://p2p-backend.onrender.com
```

### Vendor Frontend (Render env vars)
```env
VITE_SUPABASE_URL=https://gairpriyilzwijunhusu.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
VITE_API_URL=https://p2p-backend.onrender.com
```

---

## Render Free Tier Notes

- Free Web Services spin down after 15 minutes of inactivity. First request after sleep takes ~30-50 seconds.
- Free Static Sites have no sleep — always fast.
- If you need the backend always-on, upgrade to Render Starter ($7/month).
