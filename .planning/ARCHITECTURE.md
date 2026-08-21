# Agent Instructions: How to Run and Manage P2P OrgNet

If you are an AI agent or a developer jumping into this repository in the future, this document contains the essential context you need to run, debug, and understand the project.

## 1. Project Architecture & Ports
This is a microservices-based procure-to-pay (P2P) platform built around a central Supabase PostgreSQL database.

*   **Buyer Frontend (React/Vite)**: Runs on port `80` in Docker (or usually `5173` in local dev).
*   **Vendor Frontend (React/Vite)**: Runs on port `8080` in Docker (or usually `5174` in local dev).
*   **Validation Backend (Node/Express)**: Runs on port `3001`. Handles complex business logic that bypasses Supabase RLS.
*   **ML Model Service (Python/Flask/XGBoost)**: Runs on port `5000`. Analyzes invoices for fraud.
*   **Embedding Service (Node)**: Runs on port `4000`. Polls Supabase every 30 seconds for new records, generates local embeddings using `@xenova/transformers` (384 dimensions), and upserts them into Pinecone.

## 2. Running the Services
You have two primary ways to run the project.

### Method A: Docker Compose (Preferred)
The entire stack is configured in `docker-compose.yml`.
```bash
docker-compose up -d --build
```
*Note: If you encounter errors connecting to the Docker Desktop Engine on Windows (`npipe:////./pipe/dockerDesktopLinuxEngine`), fallback to Method B.*

### Method B: Local Execution (Fallback)
If Docker is unavailable, you can run the services individually in separate terminals:

**Node.js Services (Backend & Embedding Service)**
```powershell
cd backend
npm install
node src/index.js

cd embedding-service
npm install
node src/index.js
```

**Python Service (ML Model)**
```powershell
cd model
pip install -r requirements.txt
python api/app.py
```

## 3. Environment Configuration
The project relies heavily on a root `.env` file for Docker, and potentially service-specific `.env` files for local execution.

**Root `.env` format:**
```env
SUPABASE_URL=https://[YOUR_INSTANCE].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_KEY]
PINECONE_API_KEY=[YOUR_PINECONE_KEY]
PINECONE_INDEX_NAME=orgnet-embeddings
```
*(Ensure the Pinecone index is configured with **384** dimensions to match the local `all-MiniLM-L6-v2` embedding model).*

## 4. Key Considerations for Agents
*   **Database Interactions**: Frontends hit Supabase directly using Row Level Security (RLS) policies. Only complex or cross-tenant validations go through the Validation Backend.
*   **No OpenAI Needed**: The Embedding Service was intentionally built to run `@xenova/transformers` locally so it is 100% free and requires no external AI API keys.
*   **Table Names**: Ensure you use the exact table names defined in Supabase: `invoices`, `purchase_orders`, `grns`, and `purchase_requests`.
*   **PowerShell Restrictions**: If using `run_command` to execute Node commands on Windows, PowerShell might block `npm.ps1` due to execution policies. Prepend with `cmd /c` (e.g., `cmd /c "npm install"`) to bypass this if necessary.
