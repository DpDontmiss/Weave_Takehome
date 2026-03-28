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

const METRIC_RENAMES: Record<string, string> = {
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
};

// First pass: collect all engineers' scores to find what's UNIQUE about each
const allScores: Record<string, number[]> = {};
const dimKeys = Object.keys(data.topEngineers[0].dimensions);
dimKeys.forEach((k) => (allScores[k] = []));
for (const eng of data.topEngineers) {
  for (const k of dimKeys) allScores[k].push(eng.dimensions[k].score);
}

for (const eng of data.topEngineers) {
  const dims = eng.dimensions;

  // Find their most DIFFERENTIATING dimension (highest relative to peers, not just absolute)
  let bestRelative = "";
  let bestRelativeGap = -Infinity;
  for (const k of dimKeys) {
    const peerAvg =
      allScores[k].reduce((a: number, b: number) => a + b, 0) / allScores[k].length;
    const gap = dims[k].score - peerAvg;
    if (gap > bestRelativeGap) {
      bestRelativeGap = gap;
      bestRelative = k;
    }
  }
  eng.topStrength = bestRelative;

  // Generate headlines per dimension
  const m = (key: string) => dims[key].metrics;

  dims.shippingLeverage.headline = `${m("shippingLeverage").mergedPRs} PRs merged at ${m("shippingLeverage").mergeRate} rate, ~${m("shippingLeverage").medianTimeToMergeHours}h median merge time`;
  dims.teamMultiplier.headline = `${m("teamMultiplier").reviewsGiven} reviews across ${m("teamMultiplier").distinctAuthorsReviewed} authors, ${m("teamMultiplier").substantiveReviewRate} substantive`;
  dims.qualitySignal.headline = `${m("qualitySignal").firstPassMergeRate} pass on first review, ${m("qualitySignal").testInclusionRate} include tests, ${m("qualitySignal").revertRate} reverts`;
  dims.scopeReach.headline = `${m("scopeReach").codebaseZonesTouched} codebase zones, ${m("scopeReach").criticalPathRatio} critical-path work${m("scopeReach").crossStack ? ", full-stack" : ""}`;
  dims.consistency.headline = `Active ${m("consistency").activeWeeks}/${m("consistency").totalWeeks} weeks, ${m("consistency").longestStreak}-week streak, ${m("consistency").recentActivityRatio} activity in last 30d`;

  // Rename metric keys
  for (const dimKey of dimKeys) {
    const oldMetrics = dims[dimKey].metrics;
    const newMetrics: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(oldMetrics)) {
      const newKey = METRIC_RENAMES[key] || key;
      if (key === "medianTimeToMergeHours" || key === "medianReviewTurnaroundHours") {
        const hours = val as number;
        if (hours < 1) newMetrics[newKey] = `${Math.round(hours * 60)}min`;
        else if (hours < 24) newMetrics[newKey] = `${Math.round(hours * 10) / 10}h`;
        else newMetrics[newKey] = `${Math.round((hours / 24) * 10) / 10}d`;
      } else if (key === "avgPRDescriptionLength") {
        newMetrics[newKey] = `${val} chars`;
      } else if (key === "contributionEntropy") {
        newMetrics[newKey] = `${Math.round((val as number) * 100)}%`;
      } else if (key === "pageRankCentrality") {
        const v = val as number;
        if (v >= 0.08) newMetrics[newKey] = "High (top reviewer hub)";
        else if (v >= 0.05) newMetrics[newKey] = "Moderate";
        else newMetrics[newKey] = "Standard";
      } else {
        newMetrics[newKey] = val;
      }
    }
    dims[dimKey].metrics = newMetrics;
  }

  // Build differentiated summary
  const firstName = eng.name.split(" ")[0];
  const strengthLabel = DIMENSION_LABELS[bestRelative];

  // Craft a narrative that explains WHY they're ranked here
  const snippets: string[] = [];

  // Shipping context
  const mergedPRs = dims.shippingLeverage.metrics["PRs Merged"];
  const mergeRate = dims.shippingLeverage.metrics["Merge Rate"];

  // Pick the 2-3 most interesting facts
  if (dims.shippingLeverage.score >= 60) {
    snippets.push(`high-volume shipper with ${mergedPRs} PRs merged (${mergeRate} rate)`);
  } else {
    snippets.push(`merged ${mergedPRs} PRs at ${mergeRate} rate`);
  }

  // What makes them stand out
  if (bestRelative === "teamMultiplier") {
    snippets.push(
      `stands out as a team multiplier: ${dims.teamMultiplier.metrics["Reviews Given"]} reviews across ${dims.teamMultiplier.metrics["Authors Reviewed"]} teammates, with ${dims.teamMultiplier.metrics["Changes Requested Rate"]} constructive pushback`
    );
  } else if (bestRelative === "qualitySignal") {
    snippets.push(
      `exceptional code quality: ${dims.qualitySignal.metrics["First-Pass Merge Rate"]} merge on first review, ${dims.qualitySignal.metrics["Test Inclusion Rate"]} include tests`
    );
  } else if (bestRelative === "scopeReach") {
    snippets.push(
      `broad architectural impact across ${dims.scopeReach.metrics["Codebase Zones Touched"]} zones with ${dims.scopeReach.metrics["Critical Path Work"]} in critical infrastructure`
    );
  } else if (bestRelative === "consistency") {
    snippets.push(
      `remarkably consistent: active ${dims.consistency.metrics["Active Weeks"]}/${dims.consistency.metrics["Period Length (weeks)"]} weeks with a ${dims.consistency.metrics["Longest Streak (weeks)"]}-week streak`
    );
  } else if (bestRelative === "shippingLeverage") {
    // Already covered above, add a review note
    const reviews = dims.teamMultiplier.metrics["Reviews Given"];
    snippets.push(`also contributed ${reviews} code reviews`);
  }

  eng.summary = `${firstName} ${snippets.join(". ")}.`;
}

writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log("Data enriched with differentiated summaries and headlines.");
