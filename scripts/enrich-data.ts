import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const dataPath = resolve(__dirname, "../src/data/impact-data.json");
const data = JSON.parse(readFileSync(dataPath, "utf-8"));

const DIMENSION_LABELS: Record<string, string> = {
  shippingLeverage: "Shipping Leverage",
  teamMultiplier: "Team Multiplier",
  qualitySignal: "Quality Signal",
  scopeReach: "Scope & Reach",
  consistency: "Consistency",
};

// Maps from BOTH original and renamed keys to a canonical name,
// so this script is idempotent (safe to run multiple times).
const CANONICAL: Record<string, string> = {
  // Original keys → canonical
  mergedPRs: "PRs Merged",
  totalPRs: "PRs Opened",
  mergeRate: "Merge Rate",
  medianTimeToMergeHours: "Median Time to Merge",
  avgZonesPerPR: "Avg. Zones per PR",
  reviewsGiven: "Reviews Given",
  substantiveReviewRate: "Substantive Review Rate",
  distinctAuthorsReviewed: "Authors Reviewed",
  medianReviewTurnaroundHours: "Median Review Turnaround",
  changesRequestedRate: "Changes Requested Rate",
  pageRankCentrality: "Review Network Influence",
  firstPassMergeRate: "First-Pass Merge Rate",
  revertRate: "Revert Rate",
  testInclusionRate: "Test Inclusion Rate",
  avgReviewRounds: "Avg. Review Rounds",
  avgPRDescriptionLength: "Avg. PR Description Length",
  codebaseZonesTouched: "Codebase Zones Touched",
  zones: "Zones",
  criticalPathRatio: "Critical Path Work",
  crossStack: "Full-Stack Contributor",
  activeWeeks: "Active Weeks",
  totalWeeks: "Period Length (weeks)",
  longestStreak: "Longest Streak (weeks)",
  contributionEntropy: "Distribution Evenness",
  recentActivityRatio: "Recent Activity (last 30d)",
  // Already-renamed keys → themselves (idempotent)
  "PRs Merged": "PRs Merged",
  "PRs Opened": "PRs Opened",
  "Merge Rate": "Merge Rate",
  "Median Time to Merge": "Median Time to Merge",
  "Avg. Zones per PR": "Avg. Zones per PR",
  "Reviews Given": "Reviews Given",
  "Substantive Review Rate": "Substantive Review Rate",
  "Authors Reviewed": "Authors Reviewed",
  "Median Review Turnaround": "Median Review Turnaround",
  "Changes Requested Rate": "Changes Requested Rate",
  "Review Network Influence": "Review Network Influence",
  "First-Pass Merge Rate": "First-Pass Merge Rate",
  "Revert Rate": "Revert Rate",
  "Test Inclusion Rate": "Test Inclusion Rate",
  "Avg. Review Rounds": "Avg. Review Rounds",
  "Avg. PR Description Length": "Avg. PR Description Length",
  "Codebase Zones Touched": "Codebase Zones Touched",
  Zones: "Zones",
  "Critical Path Work": "Critical Path Work",
  "Full-Stack Contributor": "Full-Stack Contributor",
  "Active Weeks": "Active Weeks",
  "Period Length (weeks)": "Period Length (weeks)",
  "Longest Streak (weeks)": "Longest Streak (weeks)",
  "Distribution Evenness": "Distribution Evenness",
  "Recent Activity (last 30d)": "Recent Activity (last 30d)",
};

// Helper: get a metric value by canonical name, regardless of whether
// the JSON currently has original or renamed keys.
function getMetric(
  metrics: Record<string, unknown>,
  canonicalName: string
): unknown {
  // Direct match
  if (canonicalName in metrics) return metrics[canonicalName];
  // Search by canonical mapping
  for (const [key, val] of Object.entries(CANONICAL)) {
    if (val === canonicalName && key in metrics) return metrics[key];
  }
  return undefined;
}

// First pass: collect all engineers' scores to find what's UNIQUE about each
const allScores: Record<string, number[]> = {};
const dimKeys = Object.keys(data.topEngineers[0].dimensions);
dimKeys.forEach((k) => (allScores[k] = []));
for (const eng of data.topEngineers) {
  for (const k of dimKeys) allScores[k].push(eng.dimensions[k].score);
}

for (const eng of data.topEngineers) {
  const dims = eng.dimensions;

  // Helper to get a metric from a dimension
  const m = (dimKey: string, metricName: string) =>
    getMetric(dims[dimKey].metrics, metricName);

  // Find most differentiating dimension (highest relative to peers)
  let bestRelative = "";
  let bestRelativeGap = -Infinity;
  for (const k of dimKeys) {
    const peerAvg =
      allScores[k].reduce((a: number, b: number) => a + b, 0) /
      allScores[k].length;
    const gap = dims[k].score - peerAvg;
    if (gap > bestRelativeGap) {
      bestRelativeGap = gap;
      bestRelative = k;
    }
  }
  eng.topStrength = bestRelative;

  // ── Generate headlines per dimension ──────────────────────────────
  dims.shippingLeverage.headline = `${m("shippingLeverage", "PRs Merged")} PRs merged at ${m("shippingLeverage", "Merge Rate")} rate`;

  dims.teamMultiplier.headline = `${m("teamMultiplier", "Reviews Given")} reviews across ${m("teamMultiplier", "Authors Reviewed")} authors, ${m("teamMultiplier", "Substantive Review Rate")} substantive`;

  dims.qualitySignal.headline = `${m("qualitySignal", "First-Pass Merge Rate")} pass on first review, ${m("qualitySignal", "Test Inclusion Rate")} include tests`;

  const critWork = m("scopeReach", "Critical Path Work");
  const crossStack = m("scopeReach", "Full-Stack Contributor");
  dims.scopeReach.headline = `${m("scopeReach", "Codebase Zones Touched")} codebase zones, ${critWork} critical-path work${crossStack === true || crossStack === "Yes" ? ", full-stack" : ""}`;

  dims.consistency.headline = `Active ${m("consistency", "Active Weeks")}/${m("consistency", "Period Length (weeks)")} weeks, ${m("consistency", "Longest Streak (weeks)")}-week streak`;

  // ── Rename metric keys (idempotent) ───────────────────────────────
  for (const dimKey of dimKeys) {
    const oldMetrics = dims[dimKey].metrics;
    const newMetrics: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(oldMetrics)) {
      const newKey = CANONICAL[key] || key;

      // Format special values (only if not already formatted)
      if (
        (key === "medianTimeToMergeHours" ||
          key === "medianReviewTurnaroundHours") &&
        typeof val === "number"
      ) {
        if (val < 1) newMetrics[newKey] = `${Math.round(val * 60)}min`;
        else if (val < 24)
          newMetrics[newKey] = `${Math.round(val * 10) / 10}h`;
        else newMetrics[newKey] = `${Math.round((val / 24) * 10) / 10}d`;
      } else if (
        key === "avgPRDescriptionLength" &&
        typeof val === "number"
      ) {
        newMetrics[newKey] = `${val} chars`;
      } else if (key === "contributionEntropy" && typeof val === "number") {
        newMetrics[newKey] = `${Math.round(val * 100)}%`;
      } else if (key === "pageRankCentrality" && typeof val === "number") {
        if (val >= 0.08) newMetrics[newKey] = "High (top reviewer hub)";
        else if (val >= 0.05) newMetrics[newKey] = "Moderate";
        else newMetrics[newKey] = "Standard";
      } else {
        newMetrics[newKey] = val;
      }
    }
    dims[dimKey].metrics = newMetrics;
  }

  // ── Build differentiated summary ──────────────────────────────────
  const firstName = eng.name.split(" ")[0];
  const strengthLabel = DIMENSION_LABELS[bestRelative];

  const mergedPRs = m("shippingLeverage", "PRs Merged");
  const mergeRate = m("shippingLeverage", "Merge Rate");

  const snippets: string[] = [];

  if (dims.shippingLeverage.score >= 60) {
    snippets.push(
      `high-volume shipper with ${mergedPRs} PRs merged (${mergeRate} rate)`
    );
  } else {
    snippets.push(`merged ${mergedPRs} PRs at ${mergeRate} rate`);
  }

  if (bestRelative === "teamMultiplier") {
    snippets.push(
      `stands out as a team multiplier: ${m("teamMultiplier", "Reviews Given")} reviews across ${m("teamMultiplier", "Authors Reviewed")} teammates`
    );
  } else if (bestRelative === "qualitySignal") {
    snippets.push(
      `exceptional code quality: ${m("qualitySignal", "First-Pass Merge Rate")} merge on first review, ${m("qualitySignal", "Test Inclusion Rate")} include tests`
    );
  } else if (bestRelative === "scopeReach") {
    snippets.push(
      `broad architectural impact across ${m("scopeReach", "Codebase Zones Touched")} zones with ${m("scopeReach", "Critical Path Work")} in critical infrastructure`
    );
  } else if (bestRelative === "consistency") {
    snippets.push(
      `remarkably consistent: active ${m("consistency", "Active Weeks")}/${m("consistency", "Period Length (weeks)")} weeks with a ${m("consistency", "Longest Streak (weeks)")}-week streak`
    );
  } else if (bestRelative === "shippingLeverage") {
    snippets.push(
      `also contributed ${m("teamMultiplier", "Reviews Given")} code reviews`
    );
  }

  eng.summary = `${firstName} ${snippets.join(". ")}.`;
}

writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log("Enrichment complete (idempotent). Verifying...");

// Verify no undefined in output
const output = readFileSync(dataPath, "utf-8");
const undefinedCount = (output.match(/undefined/g) || []).length;
if (undefinedCount > 0) {
  console.error(`ERROR: Found ${undefinedCount} instances of "undefined" in output!`);
  process.exit(1);
} else {
  console.log("Verification passed: zero instances of 'undefined' in output.");
}
