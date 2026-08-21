import { Pinecone } from '@pinecone-database/pinecone';
import { pipeline } from '@xenova/transformers';

let pinecone = null;
let pineconeIndex = null;

function initClients() {
  if (!pinecone) {
    pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);
  }
}

let extractor = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

export async function searchPinecone(orgId, queryText, table = null, topK = 5) {
  initClients();
  const extract = await getExtractor();
  const output = await extract(queryText, { pooling: 'mean', normalize: true });
  const vector = Array.from(output.data);

  const filter = table ? { table } : undefined;

  const results = await pineconeIndex.namespace(orgId).query({
    vector,
    topK,
    filter,
    includeMetadata: true
  });

  return results;
}
