// backend/test_agents.js
import dotenv from "dotenv";
dotenv.config();
import { runPipeline } from "./src/agents/orchestrator.js";

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const INVOICE_ID = process.argv[2];

if (!INVOICE_ID) {
  console.log("Usage: node test_agents.js <invoice-id>");
  console.log("Example: node test_agents.js d8f6c449-74d6-444d-b6eb-811c79be2533");
  process.exit(1);
}

console.log(`\n🚀 Running full agent pipeline via GroqCloud for invoice ${INVOICE_ID}...\n`);

try {
  const result = await runPipeline(ORG_ID, INVOICE_ID);

  console.log("\n=================== PIPELINE SUMMARY ===================");
  console.log(`Pipeline ID:           ${result.pipelineId}`);
  console.log(`Total Latency:         ${result.totalLatencyMs} ms`);
  console.log(`Final Recommendation:  ${result.finalRecommendation}`);
  console.log(`Final Status:          ${result.finalStatus}`);
  console.log("========================================================\n");

  console.log("Agent Step Breakdown:");
  for (const log of result.logs) {
    const badge = log.status === "pass" ? "✅ PASS" : log.status === "warn" ? "⚠️  WARN" : "❌ FAIL";
    console.log(`  ${badge} [Agent ${log.agentNumber}] ${log.agentName} (${log.latencyMs}ms):`);
    console.log(`     └─ ${log.summary}`);
  }
} catch (err) {
  console.error("Test execution failed:", err);
}
