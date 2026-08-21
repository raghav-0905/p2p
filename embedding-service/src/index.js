import express from 'express';
import dotenv from 'dotenv';
import { runPollingCycle } from './embedder.js';
import { searchPinecone } from './search.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'Embedding service is running.' });
});

app.post('/search', async (req, res) => {
  try {
    const { org_id, query_text, table, top_k } = req.body;
    
    if (!org_id || !query_text) {
      return res.status(400).json({ error: 'org_id and query_text are required' });
    }

    const results = await searchPinecone(org_id, query_text, table, top_k || 5);
    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Embedding service API listening on port ${PORT}`);
  
  if (!process.env.SUPABASE_URL || !process.env.PINECONE_API_KEY) {
      console.warn("WARNING: Missing environment variables. Please check your .env file.");
  }
  
  // Start polling every 30 seconds
  const POLLING_INTERVAL = 30000;
  setInterval(runPollingCycle, POLLING_INTERVAL);
  
  // Run immediately on startup
  runPollingCycle();
});
