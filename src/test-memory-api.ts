/**
 * Quick smoke test for the Agent Studio Memory API integration.
 * Tests the full lifecycle: save semantic, save episodic, search, get, delete.
 *
 * Run: npx tsx src/test-memory-api.ts
 */

// Run with: npx tsx --env-file=.env src/test-memory-api.ts
import {
  saveSemantic,
  saveEpisodic,
  searchMemories,
  getMemory,
  deleteMemory,
} from "./memory/api-client.js";
import {
  saveRootCauseLearning,
  searchPastLearnings,
} from "./memory/learnings.js";
import type { Hypothesis } from "./types/memory.js";

async function main() {
  console.log("=== Agent Studio Memory API Smoke Test ===\n");

  // 1. Save a semantic memory (low-level API)
  console.log("1. Saving semantic memory...");
  const semanticResult = await saveSemantic({
    text: "Test: Redis upgrades in staging cause key format incompatibilities",
    raw_extract: JSON.stringify({ pattern: "redis-upgrade", services: ["rag-api"], severity: "high" }),
    keywords: ["test", "firstresponder", "redis", "rag-api"],
    topics: ["technical"],
    recall_triggers: ["redis", "timeout", "key format"],
    agent_ids: ["*"],
    wait: true,
  });
  console.log(`   OK — objectID: ${semanticResult.objectID}\n`);

  // 2. Save an episodic memory (low-level API)
  console.log("2. Saving episodic memory...");
  const episodicResult = await saveEpisodic({
    text: "Test: Investigated Redis timeouts in rag-api",
    raw_extract: "Full investigation step details",
    observation: "847 Redis timeout errors starting at 08:47Z in rag-api",
    thoughts: "Correlates with Redis 6.2→7.0 upgrade deployed at 08:44Z",
    action: "Queried deployment logs and Redis connection metrics",
    result: "Confirmed key format change in Redis 7.0 caused serialization failures",
    keywords: ["test", "firstresponder", "redis", "rag-api", "investigation-step"],
    topics: ["technical"],
    recall_triggers: ["redis timeout", "rag-api errors"],
    agent_ids: ["*"],
    wait: true,
  });
  console.log(`   OK — objectID: ${episodicResult.objectID}\n`);

  // 3. Search memories
  console.log("3. Searching for 'redis timeout rag-api'...");
  const searchResult = await searchMemories({
    queries: ["redis timeout rag-api"],
    keywords: ["firstresponder"],
    topics: ["technical"],
    limit: 5,
  });
  console.log(`   OK — ${searchResult.nbHits} hits found\n`);

  // 4. Get by ID
  console.log("4. Getting semantic memory by ID...");
  const record = await getMemory(semanticResult.objectID);
  console.log(`   OK — text: "${record.text}"\n`);

  // 5. Test learnings module (high-level)
  console.log("5. Testing saveRootCauseLearning...");
  const fakeHypothesis: Hypothesis = {
    id: "hyp_test",
    title: "Redis key format incompatibility after upgrade",
    proposed_at: new Date().toISOString(),
    proposed_by: "agent",
    status: "confirmed_root_cause",
    confidence: "high",
    supporting_evidence: ["Redis upgraded 6.2→7.0", "847 timeout errors", "Key format mismatch"],
    counter_evidence: [],
  };
  await saveRootCauseLearning("inc_test_123", fakeHypothesis, ["rag-api"]);
  console.log("   OK — learning saved\n");

  // 6. Test searchPastLearnings
  console.log("6. Testing searchPastLearnings for 'redis timeout'...");
  // Small delay to allow indexing
  await new Promise((r) => setTimeout(r, 1000));
  const learnings = await searchPastLearnings("redis timeout", ["rag-api"]);
  console.log(`   OK — ${learnings ? "found learnings" : "no learnings found"}`);
  if (learnings) {
    console.log(`   Preview:\n${learnings.split("\n").map((l) => `   ${l}`).join("\n")}\n`);
  }

  // 7. Cleanup — best effort, don't fail the test on cleanup errors
  console.log("7. Cleaning up test memories...");
  const idsToDelete = new Set([semanticResult.objectID, episodicResult.objectID]);

  // Also find any other test memories (e.g., from saveRootCauseLearning)
  await new Promise((r) => setTimeout(r, 1000));
  const cleanup = await searchMemories({
    queries: ["test firstresponder redis"],
    keywords: ["test", "firstresponder"],
    limit: 10,
  });
  for (const hit of cleanup.hits) {
    if (hit.keywords.includes("test")) {
      idsToDelete.add(hit.objectID);
    }
  }

  for (const id of idsToDelete) {
    try {
      await deleteMemory(id);
      console.log(`   Deleted: ${id.slice(0, 16)}...`);
    } catch {
      console.log(`   Skip (already deleted?): ${id.slice(0, 16)}...`);
    }
  }
  console.log("   OK — cleanup complete\n");

  console.log("=== All tests passed ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
