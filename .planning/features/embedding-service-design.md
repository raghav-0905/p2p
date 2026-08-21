# Embedding Service — Polling Architecture

Standalone service. Does NOT touch frontend, Supabase RLS, or any existing code path.
Frontend continues writing to Supabase exactly as it does today. This service only reads.

---

## 1. Schema change

Add to `invoice`, `po`, `grn`, `pr` tables:
```sql
ALTER TABLE invoice ADD COLUMN embedded boolean NOT NULL DEFAULT false;
ALTER TABLE po      ADD COLUMN embedded boolean NOT NULL DEFAULT false;
ALTER TABLE grn     ADD COLUMN embedded boolean NOT NULL DEFAULT false;
ALTER TABLE pr      ADD COLUMN embedded boolean NOT NULL DEFAULT false;
```
That's the only schema change. No triggers, no new tables, no queue.

---

## 2. Pinecone setup

- One serverless index, metric = cosine
- Dimension must match embedding model output (e.g. 1536 for OpenAI `text-embedding-3-small`)
- Namespace = `org_id` (each org isolated to its own namespace)
- Vector id = `${table}:${row.id}`

---

## 3. Service

New standalone service, `embedding-service/`. Node or Python, either is fine — pick
whichever matches the agent's existing stack. Runs independently, own process/container,
own `.env` (Supabase service role key, Pinecone API key, embedding provider API key).

### Main loop
Runs every 30–60 seconds (setInterval / cron / while-loop with sleep):

```
for table in [invoice, po, grn, pr]:
    rows = SELECT * FROM {table} WHERE embedded = false LIMIT 50

    for row in rows:
        text = serialize(table, row)      # flatten row into a plain text string
        vector = embed(text)              # call embedding provider

        pinecone.upsert(
            namespace = row.org_id,
            id = f"{table}:{row.id}",
            values = vector,
            metadata = { table, row_id: row.id, org_id: row.org_id, created_at: row.created_at }
        )

        UPDATE {table} SET embedded = true WHERE id = row.id
```

### serialize(table, row)
One function per table. Flatten the row into a short plain-text description. Example for invoice:
```
f"Invoice {row.id}, vendor {row.vendor_name}, PO {row.po_id}, total {row.total_amount}, date {row.invoice_date}, status {row.status}"
```
Same pattern for po, grn, pr — just list the fields that matter.

### Error handling
- If embedding or Pinecone call fails: skip the row, log the error, do NOT set `embedded = true`. It gets retried next cycle automatically. No dead-letter logic needed at this stage.
- Batch size (LIMIT 50) prevents one big backlog from blocking a cycle.

---

## 4. Search (for later use)

Add one endpoint to the same service:
```
POST /search
Body: { org_id, query_text, table (optional), top_k=5 }

vector = embed(query_text)
results = pinecone.query(namespace=org_id, vector=vector, topK=top_k, filter={table} if given)
return results
```

---

## 5. Infra

- Add `embedding-service` to `docker-compose.yml`: own container, no dependency on other services besides network access to Supabase and Pinecone.
- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `EMBEDDING_API_KEY`.
- No changes to any other container, k8s manifest, or the frontend.

---

## 6. Test checklist

- [ ] Insert a row via the existing frontend → within 60s it shows `embedded = true`
- [ ] Vector appears in Pinecone under the correct namespace
- [ ] Kill Pinecone access mid-cycle → row stays `embedded = false`, retried next cycle, no crash
- [ ] `/search` with org A returns only org A vectors (query namespace isolation directly)
