import { graphql } from "@octokit/graphql";
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolve } from "path";

// ─── Config ────────────────────────────────────────────────────────────────
const OWNER = "PostHog";
const REPO = "posthog";
const DAYS = 90;
const TOP_N = 5;
const MIN_MERGED_PRS = 3;
const MIN_ACTIVE_WEEKS = 2;
const PRS_PER_PAGE = 30; // keep low to avoid GraphQL complexity limits

// ─── Codebase Zone Mapping ─────────────────────────────────────────────────
const ZONE_PATTERNS: Record<string, RegExp[]> = {
  "Frontend UI": [/^frontend\/src\/scenes\//, /^frontend\/src\/layout\//],
  "Frontend Lib": [
    /^frontend\/src\/lib\//,
    /^frontend\/src\/queries\//,
    /^frontend\/src\/toolbar\//,
  ],
  "Backend API": [/^posthog\/api\//],
  "Backend Models": [/^posthog\/models\//],
  "HogQL/Analytics": [/^posthog\/hogql\//, /^posthog\/hogql_queries\//],
  ClickHouse: [/^posthog\/clickhouse\//],
  "Data Pipeline": [/^posthog\/warehouse\//, /^posthog\/batch_exports\//],
  Infrastructure: [/^docker\//, /^\.github\//, /^bin\//, /^deploy\//],
  "Rust Core": [/^rust\//],
  "Product Modules": [/^products\//],
  Enterprise: [/^ee\//],
};

const CRITICAL_ZONES = new Set([
  "Backend API",
  "Backend Models",
  "HogQL/Analytics",
  "ClickHouse",
  "Rust Core",
]);

const FRONTEND_ZONES = new Set(["Frontend UI", "Frontend Lib"]);
const BACKEND_ZONES = new Set([
  "Backend API",
  "Backend Models",
  "HogQL/Analytics",
  "ClickHouse",
  "Rust Core",
  "Data Pipeline",
  "Enterprise",
]);

// ─── Helper Functions ──────────────────────────────────────────────────────
function classifyFile(path: string): string[] {
  const zones: string[] = [];
  for (const [zone, patterns] of Object.entries(ZONE_PATTERNS)) {
    if (patterns.some((p) => p.test(path))) {
      zones.push(zone);
    }
  }
  // Check for test files
  if (/test|spec|__tests__|\.test\.|\.spec\./.test(path)) {
    zones.push("Tests");
  }
  return zones.length > 0 ? zones : ["Other"];
}

function detectWorkType(
  title: string,
  labels: string[]
): { type: string; weight: number } {
  const t = title.toLowerCase();
  const l = labels.map((s) => s.toLowerCase());

  if (
    l.some((s) => s.includes("bug") || s.includes("fix")) ||
    t.startsWith("fix") ||
    t.startsWith("bugfix")
  )
    return { type: "bug fix", weight: 1.0 };
  if (
    l.some((s) => s.includes("infra") || s.includes("ops") || s.includes("ci")) ||
    t.includes("migration") ||
    t.includes("infra") ||
    t.includes("deploy")
  )
    return { type: "infrastructure", weight: 1.5 };
  if (
    l.some((s) => s.includes("feature") || s.includes("enhancement")) ||
    t.startsWith("feat") ||
    t.startsWith("add")
  )
    return { type: "feature", weight: 1.2 };
  if (l.some((s) => s.includes("chore") || s.includes("tech-debt")))
    return { type: "chore", weight: 0.8 };
  return { type: "other", weight: 0.9 };
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const probs = counts.map((c) => c / total).filter((p) => p > 0);
  return -probs.reduce((sum, p) => sum + p * Math.log2(p), 0);
}

function bellCurve(value: number, center: number, sigma: number): number {
  return Math.exp(-((value - center) ** 2) / (2 * sigma ** 2));
}

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

// Simple PageRank (iterative)
function pageRank(
  edges: { from: string; to: string; weight: number }[],
  nodes: string[],
  damping = 0.85,
  iterations = 20
): Map<string, number> {
  const N = nodes.length;
  if (N === 0) return new Map();

  const rank = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const inEdges = new Map<string, { from: string; weight: number }[]>();

  nodes.forEach((n) => {
    rank.set(n, 1 / N);
    outDegree.set(n, 0);
    inEdges.set(n, []);
  });

  edges.forEach((e) => {
    outDegree.set(e.from, (outDegree.get(e.from) || 0) + e.weight);
    inEdges.get(e.to)?.push({ from: e.from, weight: e.weight });
  });

  for (let i = 0; i < iterations; i++) {
    const newRank = new Map<string, number>();
    nodes.forEach((node) => {
      let sum = 0;
      for (const edge of inEdges.get(node) || []) {
        const out = outDegree.get(edge.from) || 1;
        sum += ((rank.get(edge.from) || 0) * edge.weight) / out;
      }
      newRank.set(node, (1 - damping) / N + damping * sum);
    });
    nodes.forEach((n) => rank.set(n, newRank.get(n) || 0));
  }

  return rank;
}

// ─── GraphQL Query ─────────────────────────────────────────────────────────
const PR_QUERY = `
query($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(
      first: ${PRS_PER_PAGE}
      after: $cursor
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        number
        title
        body
        state
        merged
        createdAt
        mergedAt
        authorAssociation
        author {
          login
          avatarUrl
          ... on User { name }
        }
        labels(first: 10) {
          nodes { name }
        }
        files(first: 100) {
          totalCount
          nodes { path additions deletions }
        }
        reviews(first: 30) {
          totalCount
          nodes {
            author { login }
            state
            body
            submittedAt
            comments { totalCount }
          }
        }
      }
    }
  }
  rateLimit {
    remaining
    resetAt
  }
}
`;

// ─── Types for raw API data ────────────────────────────────────────────────
interface RawPR {
  number: number;
  title: string;
  body: string | null;
  state: string;
  merged: boolean;
  createdAt: string;
  mergedAt: string | null;
  authorAssociation: string;
  author: { login: string; avatarUrl: string; name?: string } | null;
  labels: { nodes: { name: string }[] };
  files: {
    totalCount: number;
    nodes: { path: string; additions: number; deletions: number }[];
  };
  reviews: {
    totalCount: number;
    nodes: {
      author: { login: string } | null;
      state: string;
      body: string;
      submittedAt: string;
      comments: { totalCount: number };
    }[];
  };
}

interface EngineerMetrics {
  login: string;
  avatarUrl: string;
  name: string;
  // Shipping
  totalPRs: number;
  mergedPRs: number;
  mergeRate: number;
  prComplexityScores: number[];
  workTypeWeights: number[];
  timeToMergeHours: number[];
  // Team Multiplier
  reviewsGiven: number;
  substantiveReviews: number;
  reviewCommentDepths: number[];
  reviewAuthorDiversity: Set<string>;
  changesRequestedCount: number;
  totalReviewsGiven: number;
  reviewTurnaroundHours: number[];
  // Quality
  firstPassMergeCount: number;
  revertCount: number;
  testInclusionCount: number;
  reviewFrictionPerPR: number[];
  prDescriptionLengths: number[];
  // Scope
  allZones: Set<string>;
  criticalPathFiles: number;
  totalFiles: number;
  touchedFrontend: boolean;
  touchedBackend: boolean;
  // Consistency
  weeklyActivity: Map<string, number>;
  // Notable PRs
  notablePRs: {
    number: number;
    title: string;
    mergedAt: string;
    additions: number;
    deletions: number;
    filesChanged: number;
    zones: string[];
    complexity: number;
  }[];
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔑 Getting GitHub token...");
  const token = execSync("gh auth token").toString().trim();

  const graphqlWithAuth = graphql.defaults({
    headers: { authorization: `token ${token}` },
  });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS);
  const periodStart = cutoffDate.toISOString().split("T")[0];
  const periodEnd = new Date().toISOString().split("T")[0];

  console.log(`📅 Fetching PRs from ${periodStart} to ${periodEnd}...`);

  // ── Step 1: Fetch all PRs ──────────────────────────────────────────────
  const allPRs: RawPR[] = [];
  let cursor: string | null = null;
  let page = 0;
  let reachedCutoff = false;

  while (!reachedCutoff) {
    page++;
    console.log(
      `  Fetching page ${page}... (${allPRs.length} PRs so far)`
    );

    try {
      const result: any = await graphqlWithAuth(PR_QUERY, {
        owner: OWNER,
        repo: REPO,
        cursor,
      });

      const { nodes, pageInfo } = result.repository.pullRequests;
      const remaining = result.rateLimit.remaining;
      console.log(`  Rate limit remaining: ${remaining}`);

      for (const pr of nodes) {
        const createdAt = new Date(pr.createdAt);
        if (createdAt < cutoffDate) {
          reachedCutoff = true;
          break;
        }
        allPRs.push(pr);
      }

      if (!pageInfo.hasNextPage) break;
      cursor = pageInfo.endCursor;

      // Small delay to be nice to GitHub API
      if (remaining < 100) {
        console.log("  ⏳ Rate limit low, waiting 5s...");
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err: any) {
      console.error(`  ❌ Error on page ${page}:`, err.message);
      if (err.message?.includes("rate limit") || err.message?.includes("abuse")) {
        console.log("  ⏳ Rate limited, waiting 30s...");
        await new Promise((r) => setTimeout(r, 30000));
        continue;
      }
      throw err;
    }
  }

  console.log(`\n✅ Fetched ${allPRs.length} PRs in the 90-day window`);

  // ── Step 2: Filter ─────────────────────────────────────────────────────
  const BOT_PATTERNS = [/\[bot\]$/, /-bot$/, /^dependabot/, /^renovate/, /^github-actions/];

  const memberPRs = allPRs.filter((pr) => {
    if (!pr.author) return false;
    const login = pr.author.login;
    if (BOT_PATTERNS.some((p) => p.test(login))) return false;
    // Focus on org members and collaborators
    return ["MEMBER", "COLLABORATOR"].includes(pr.authorAssociation);
  });

  console.log(
    `👥 ${memberPRs.length} PRs from org members/collaborators`
  );

  // ── Step 3: Compute per-engineer raw metrics ──────────────────────────
  const engineerMap = new Map<string, EngineerMetrics>();

  function getOrCreateEngineer(pr: RawPR): EngineerMetrics {
    const login = pr.author!.login;
    if (!engineerMap.has(login)) {
      engineerMap.set(login, {
        login,
        avatarUrl: pr.author!.avatarUrl,
        name: pr.author!.name || login,
        totalPRs: 0,
        mergedPRs: 0,
        mergeRate: 0,
        prComplexityScores: [],
        workTypeWeights: [],
        timeToMergeHours: [],
        reviewsGiven: 0,
        substantiveReviews: 0,
        reviewCommentDepths: [],
        reviewAuthorDiversity: new Set(),
        changesRequestedCount: 0,
        totalReviewsGiven: 0,
        reviewTurnaroundHours: [],
        firstPassMergeCount: 0,
        revertCount: 0,
        testInclusionCount: 0,
        reviewFrictionPerPR: [],
        prDescriptionLengths: [],
        allZones: new Set(),
        criticalPathFiles: 0,
        totalFiles: 0,
        touchedFrontend: false,
        touchedBackend: false,
        weeklyActivity: new Map(),
        notablePRs: [],
      });
    }
    return engineerMap.get(login)!;
  }

  // Process PRs for shipping/quality/scope metrics (PR author)
  for (const pr of memberPRs) {
    const eng = getOrCreateEngineer(pr);
    eng.totalPRs++;

    // Zones for this PR
    const prZones = new Set<string>();
    let criticalFiles = 0;
    for (const file of pr.files.nodes) {
      const zones = classifyFile(file.path);
      zones.forEach((z) => {
        prZones.add(z);
        eng.allZones.add(z);
        if (CRITICAL_ZONES.has(z)) criticalFiles++;
        if (FRONTEND_ZONES.has(z)) eng.touchedFrontend = true;
        if (BACKEND_ZONES.has(z)) eng.touchedBackend = true;
      });
    }
    eng.criticalPathFiles += criticalFiles;
    eng.totalFiles += pr.files.nodes.length;

    // Work type
    const labels = pr.labels.nodes.map((l) => l.name);
    const { weight: typeWeight } = detectWorkType(pr.title, labels);

    // PR complexity = distinct zones
    const complexity = prZones.size;
    eng.prComplexityScores.push(complexity);
    eng.workTypeWeights.push(typeWeight);

    // PR description quality
    eng.prDescriptionLengths.push(pr.body?.length || 0);

    // Test inclusion
    const hasTests = pr.files.nodes.some((f) =>
      /test|spec|__tests__|\.test\.|\.spec\./.test(f.path)
    );

    // Check if this is a revert
    if (/^revert/i.test(pr.title)) {
      // Find the original author - for now count against the reverter
      eng.revertCount++;
    }

    if (pr.merged && pr.mergedAt) {
      eng.mergedPRs++;

      // Time to merge
      const created = new Date(pr.createdAt).getTime();
      const merged = new Date(pr.mergedAt).getTime();
      const hoursToMerge = (merged - created) / (1000 * 60 * 60);
      eng.timeToMergeHours.push(hoursToMerge);

      // Test inclusion (merged PRs only)
      if (hasTests) eng.testInclusionCount++;

      // Review friction - count CHANGES_REQUESTED reviews on this PR
      const changesRequested = pr.reviews.nodes.filter(
        (r) => r.state === "CHANGES_REQUESTED"
      ).length;
      eng.reviewFrictionPerPR.push(changesRequested);

      // First pass merge (no CHANGES_REQUESTED)
      if (changesRequested === 0) eng.firstPassMergeCount++;

      // Notable PR tracking
      eng.notablePRs.push({
        number: pr.number,
        title: pr.title,
        mergedAt: pr.mergedAt,
        additions: pr.files.nodes.reduce((s, f) => s + f.additions, 0),
        deletions: pr.files.nodes.reduce((s, f) => s + f.deletions, 0),
        filesChanged: pr.files.totalCount,
        zones: [...prZones],
        complexity: complexity * typeWeight,
      });
    }

    // Weekly activity (for consistency)
    const week = getISOWeek(new Date(pr.createdAt));
    eng.weeklyActivity.set(week, (eng.weeklyActivity.get(week) || 0) + 1);
  }

  // Process reviews (reviewer metrics)
  const reviewEdges: { from: string; to: string; weight: number }[] = [];

  for (const pr of memberPRs) {
    if (!pr.author) continue;
    const prAuthor = pr.author.login;

    for (const review of pr.reviews.nodes) {
      if (!review.author) continue;
      const reviewer = review.author.login;
      if (reviewer === prAuthor) continue; // skip self-reviews
      if (BOT_PATTERNS.some((p) => p.test(reviewer))) continue;

      // Ensure reviewer engineer exists
      if (!engineerMap.has(reviewer)) {
        // Create a minimal entry - they might be a member who only reviews
        engineerMap.set(reviewer, {
          login: reviewer,
          avatarUrl: "",
          name: reviewer,
          totalPRs: 0,
          mergedPRs: 0,
          mergeRate: 0,
          prComplexityScores: [],
          workTypeWeights: [],
          timeToMergeHours: [],
          reviewsGiven: 0,
          substantiveReviews: 0,
          reviewCommentDepths: [],
          reviewAuthorDiversity: new Set(),
          changesRequestedCount: 0,
          totalReviewsGiven: 0,
          reviewTurnaroundHours: [],
          firstPassMergeCount: 0,
          revertCount: 0,
          testInclusionCount: 0,
          reviewFrictionPerPR: [],
          prDescriptionLengths: [],
          allZones: new Set(),
          criticalPathFiles: 0,
          totalFiles: 0,
          touchedFrontend: false,
          touchedBackend: false,
          weeklyActivity: new Map(),
          notablePRs: [],
        });
      }

      const eng = engineerMap.get(reviewer)!;
      eng.totalReviewsGiven++;
      eng.reviewAuthorDiversity.add(prAuthor);

      // Substantive review: has body > 10 chars or inline comments
      const isSubstantive =
        (review.body && review.body.length > 10) ||
        review.comments.totalCount > 0;
      if (isSubstantive) eng.substantiveReviews++;

      eng.reviewCommentDepths.push(review.comments.totalCount);

      if (review.state === "CHANGES_REQUESTED") {
        eng.changesRequestedCount++;
      }

      // Review turnaround
      const prCreated = new Date(pr.createdAt).getTime();
      const reviewSubmitted = new Date(review.submittedAt).getTime();
      const turnaroundHours =
        (reviewSubmitted - prCreated) / (1000 * 60 * 60);
      if (turnaroundHours > 0 && turnaroundHours < 720) {
        // cap at 30 days
        eng.reviewTurnaroundHours.push(turnaroundHours);
      }

      // Review activity for consistency
      const week = getISOWeek(new Date(review.submittedAt));
      eng.weeklyActivity.set(week, (eng.weeklyActivity.get(week) || 0) + 1);

      // Review network edge
      reviewEdges.push({ from: reviewer, to: prAuthor, weight: 1 });
    }
  }

  // ── Step 4: Filter engineers with minimum activity ────────────────────
  const totalWeeks = Math.ceil(DAYS / 7);
  const activeEngineers = [...engineerMap.values()].filter((eng) => {
    const activeWeeks = eng.weeklyActivity.size;
    return eng.mergedPRs >= MIN_MERGED_PRS && activeWeeks >= MIN_ACTIVE_WEEKS;
  });

  console.log(
    `\n📊 ${activeEngineers.length} engineers meet minimum activity thresholds`
  );

  if (activeEngineers.length === 0) {
    console.error("No engineers found meeting thresholds. Exiting.");
    process.exit(1);
  }

  // ── Step 5: Compute PageRank ──────────────────────────────────────────
  const allLogins = activeEngineers.map((e) => e.login);
  const filteredEdges = reviewEdges.filter(
    (e) => allLogins.includes(e.from) && allLogins.includes(e.to)
  );
  const prScores = pageRank(filteredEdges, allLogins);

  // ── Step 6: Score each dimension ──────────────────────────────────────
  // Compute merge rate
  activeEngineers.forEach((eng) => {
    eng.mergeRate = eng.totalPRs > 0 ? eng.mergedPRs / eng.totalPRs : 0;
    eng.reviewsGiven = eng.totalReviewsGiven;
  });

  // Collect raw values for normalization
  const mergeRates = activeEngineers.map((e) => e.mergeRate);
  const complexitySums = activeEngineers.map((e) =>
    e.prComplexityScores.reduce((a, b) => a + b, 0)
  );
  const workTypeSums = activeEngineers.map((e) =>
    e.workTypeWeights.reduce((a, b) => a + b, 0)
  );
  const timeToMergeMedians = activeEngineers.map((e) =>
    e.timeToMergeHours.length > 0 ? median(e.timeToMergeHours) : Infinity
  );
  const mergedCounts = activeEngineers.map((e) => e.mergedPRs);

  // Team multiplier raw values
  const substantiveRatios = activeEngineers.map((e) =>
    e.totalReviewsGiven > 0
      ? e.substantiveReviews / e.totalReviewsGiven
      : 0
  );
  const reviewDepths = activeEngineers.map((e) =>
    e.reviewCommentDepths.length > 0
      ? e.reviewCommentDepths.reduce((a, b) => a + b, 0) /
        e.reviewCommentDepths.length
      : 0
  );
  const reviewDiversities = activeEngineers.map(
    (e) => e.reviewAuthorDiversity.size
  );
  const crRatios = activeEngineers.map((e) =>
    e.totalReviewsGiven > 0
      ? e.changesRequestedCount / e.totalReviewsGiven
      : 0
  );
  const reviewTurnarounds = activeEngineers.map((e) =>
    e.reviewTurnaroundHours.length > 0
      ? median(e.reviewTurnaroundHours)
      : Infinity
  );
  const reviewCounts = activeEngineers.map((e) => e.totalReviewsGiven);
  const pageRankScores = activeEngineers.map(
    (e) => prScores.get(e.login) || 0
  );

  // Quality raw values
  const firstPassRates = activeEngineers.map((e) =>
    e.mergedPRs > 0 ? e.firstPassMergeCount / e.mergedPRs : 0
  );
  const revertRates = activeEngineers.map((e) =>
    e.totalPRs > 0 ? e.revertCount / e.totalPRs : 0
  );
  const testRates = activeEngineers.map((e) =>
    e.mergedPRs > 0 ? e.testInclusionCount / e.mergedPRs : 0
  );
  const frictions = activeEngineers.map((e) =>
    e.reviewFrictionPerPR.length > 0
      ? e.reviewFrictionPerPR.reduce((a, b) => a + b, 0) /
        e.reviewFrictionPerPR.length
      : 0
  );
  const descLengths = activeEngineers.map((e) =>
    e.prDescriptionLengths.length > 0
      ? e.prDescriptionLengths.reduce((a, b) => a + b, 0) /
        e.prDescriptionLengths.length
      : 0
  );

  // Scope raw values
  const zoneCounts = activeEngineers.map((e) => e.allZones.size);
  const criticalRatios = activeEngineers.map((e) =>
    e.totalFiles > 0 ? e.criticalPathFiles / e.totalFiles : 0
  );
  const crossStack = activeEngineers.map((e) =>
    e.touchedFrontend && e.touchedBackend ? 1 : 0
  );

  // Consistency raw values
  const activeWeekCounts = activeEngineers.map(
    (e) => e.weeklyActivity.size
  );
  const entropies = activeEngineers.map((e) => {
    const counts = [...e.weeklyActivity.values()];
    const entropy = shannonEntropy(counts);
    const maxEntropy = Math.log2(Math.max(counts.length, 1));
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  });
  const streaks = activeEngineers.map((e) => {
    // Compute all possible weeks in the period
    const allWeeks: string[] = [];
    const d = new Date(cutoffDate);
    while (d <= new Date()) {
      allWeeks.push(getISOWeek(d));
      d.setDate(d.getDate() + 7);
    }
    const uniqueWeeks = [...new Set(allWeeks)];

    let maxStreak = 0;
    let currentStreak = 0;
    for (const week of uniqueWeeks) {
      if (e.weeklyActivity.has(week)) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    return maxStreak;
  });

  const lateWindowActivities = activeEngineers.map((e) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let recentCount = 0;
    let totalCount = 0;
    for (const [week, count] of e.weeklyActivity) {
      totalCount += count;
      // Approximate: if week is in last 30 days
      const weekDate = new Date(week.replace("W", "") + "-1");
      if (!isNaN(weekDate.getTime()) && weekDate >= thirtyDaysAgo) {
        recentCount += count;
      }
    }
    return totalCount > 0 ? recentCount / totalCount : 0;
  });

  // ── Normalize all values ──────────────────────────────────────────────
  const n_mergeRates = normalize(mergeRates);
  const n_complexity = normalize(complexitySums);
  const n_workType = normalize(workTypeSums);
  const n_ttm = normalize(
    timeToMergeMedians.map((v) => (v === Infinity ? 0 : 1 / (v + 0.1)))
  );
  const n_merged = normalize(mergedCounts);

  const n_substantive = normalize(substantiveRatios);
  const n_depth = normalize(reviewDepths);
  const n_diversity = normalize(reviewDiversities);
  const crScores = crRatios.map((r) => bellCurve(r, 0.22, 0.1));
  const n_cr = normalize(crScores);
  const n_turnaround = normalize(
    reviewTurnarounds.map((v) => (v === Infinity ? 0 : 1 / (v + 0.1)))
  );
  const n_reviewCount = normalize(reviewCounts);
  const n_pagerank = normalize(pageRankScores);

  const n_firstPass = normalize(firstPassRates);
  const n_revert = normalize(revertRates.map((r) => 1 - r));
  const n_test = normalize(testRates);
  const n_friction = normalize(
    frictions.map((f) => 1 / (f + 0.1))
  );
  const n_desc = normalize(
    descLengths.map((d) => Math.min(d, 500) / 500)
  );

  const n_zones = normalize(zoneCounts);
  const n_critical = normalize(criticalRatios);

  const n_activeWeeks = normalize(
    activeWeekCounts.map((w) => w / totalWeeks)
  );
  const n_entropy = normalize(entropies);
  const n_streaks = normalize(streaks.map((s) => s / totalWeeks));
  const lateScores = lateWindowActivities.map((a) =>
    bellCurve(a, 0.33, 0.15)
  );
  const n_late = normalize(lateScores);

  // ── Compute dimension scores ──────────────────────────────────────────
  interface ScoredEngineer {
    index: number;
    login: string;
    shipping: number;
    teamMultiplier: number;
    quality: number;
    scope: number;
    consistency: number;
    composite: number;
  }

  const scored: ScoredEngineer[] = activeEngineers.map((eng, i) => {
    // Shipping Leverage
    const shipping =
      0.3 * n_mergeRates[i] +
      0.25 * n_complexity[i] +
      0.2 * n_workType[i] +
      0.15 * n_ttm[i] +
      0.1 * n_merged[i];

    // Team Multiplier (with PageRank bonus)
    const baseTeam =
      0.25 * n_substantive[i] +
      0.2 * n_depth[i] +
      0.2 * n_diversity[i] +
      0.15 * n_cr[i] +
      0.1 * n_turnaround[i] +
      0.1 * n_reviewCount[i];
    const teamMultiplier = baseTeam * (1 + 0.3 * n_pagerank[i]);

    // Quality Signal
    const quality =
      0.3 * n_firstPass[i] +
      0.25 * n_revert[i] +
      0.2 * n_test[i] +
      0.15 * n_friction[i] +
      0.1 * n_desc[i];

    // Scope & Reach
    const scope =
      0.3 * n_zones[i] +
      0.3 * n_critical[i] +
      0.2 * crossStack[i] +
      0.2 * 0.5; // placeholder for issue engagement

    // Consistency
    const consistency =
      0.3 * n_activeWeeks[i] +
      0.3 * n_entropy[i] +
      0.2 * n_streaks[i] +
      0.2 * n_late[i];

    // Composite score
    const composite =
      0.3 * shipping +
      0.25 * teamMultiplier +
      0.2 * quality +
      0.15 * scope +
      0.1 * consistency;

    return {
      index: i,
      login: eng.login,
      shipping,
      teamMultiplier,
      quality,
      scope,
      consistency,
      composite,
    };
  });

  // Sort by composite score
  scored.sort((a, b) => b.composite - a.composite);

  // ── Step 7: Build output JSON ─────────────────────────────────────────
  const topScored = scored.slice(0, TOP_N);

  function formatDimensionMetrics(eng: EngineerMetrics, i: number) {
    return {
      shippingLeverage: {
        score: Math.round(scored.find((s) => s.login === eng.login)!.shipping * 100),
        metrics: {
          mergedPRs: eng.mergedPRs,
          totalPRs: eng.totalPRs,
          mergeRate: `${Math.round(eng.mergeRate * 100)}%`,
          medianTimeToMergeHours: Math.round(median(eng.timeToMergeHours) * 10) / 10,
          avgZonesPerPR:
            eng.prComplexityScores.length > 0
              ? Math.round(
                  (eng.prComplexityScores.reduce((a, b) => a + b, 0) /
                    eng.prComplexityScores.length) *
                    10
                ) / 10
              : 0,
        },
        explanation: `Merged ${eng.mergedPRs} of ${eng.totalPRs} PRs (${Math.round(eng.mergeRate * 100)}% merge rate). Median time to merge: ${Math.round(median(eng.timeToMergeHours))}h. PRs averaged ${eng.prComplexityScores.length > 0 ? (eng.prComplexityScores.reduce((a, b) => a + b, 0) / eng.prComplexityScores.length).toFixed(1) : 0} codebase zones each.`,
      },
      teamMultiplier: {
        score: Math.round(
          scored.find((s) => s.login === eng.login)!.teamMultiplier * 100
        ),
        metrics: {
          reviewsGiven: eng.totalReviewsGiven,
          substantiveReviewRate: `${eng.totalReviewsGiven > 0 ? Math.round((eng.substantiveReviews / eng.totalReviewsGiven) * 100) : 0}%`,
          distinctAuthorsReviewed: eng.reviewAuthorDiversity.size,
          medianReviewTurnaroundHours:
            Math.round(median(eng.reviewTurnaroundHours) * 10) / 10,
          changesRequestedRate: `${eng.totalReviewsGiven > 0 ? Math.round((eng.changesRequestedCount / eng.totalReviewsGiven) * 100) : 0}%`,
          pageRankCentrality:
            Math.round((prScores.get(eng.login) || 0) * 10000) / 10000,
        },
        explanation: `Gave ${eng.totalReviewsGiven} reviews across ${eng.reviewAuthorDiversity.size} different authors. ${eng.totalReviewsGiven > 0 ? Math.round((eng.substantiveReviews / eng.totalReviewsGiven) * 100) : 0}% included substantive comments. Median review turnaround: ${Math.round(median(eng.reviewTurnaroundHours))}h.`,
      },
      qualitySignal: {
        score: Math.round(
          scored.find((s) => s.login === eng.login)!.quality * 100
        ),
        metrics: {
          firstPassMergeRate: `${eng.mergedPRs > 0 ? Math.round((eng.firstPassMergeCount / eng.mergedPRs) * 100) : 0}%`,
          revertRate: `${eng.totalPRs > 0 ? Math.round((eng.revertCount / eng.totalPRs) * 100) : 0}%`,
          testInclusionRate: `${eng.mergedPRs > 0 ? Math.round((eng.testInclusionCount / eng.mergedPRs) * 100) : 0}%`,
          avgReviewRounds:
            Math.round(
              (eng.reviewFrictionPerPR.length > 0
                ? eng.reviewFrictionPerPR.reduce((a, b) => a + b, 0) /
                  eng.reviewFrictionPerPR.length
                : 0) * 10
            ) / 10,
          avgPRDescriptionLength: Math.round(
            eng.prDescriptionLengths.length > 0
              ? eng.prDescriptionLengths.reduce((a, b) => a + b, 0) /
                eng.prDescriptionLengths.length
              : 0
          ),
        },
        explanation: `${eng.mergedPRs > 0 ? Math.round((eng.firstPassMergeCount / eng.mergedPRs) * 100) : 0}% of PRs merged without changes requested. ${eng.mergedPRs > 0 ? Math.round((eng.testInclusionCount / eng.mergedPRs) * 100) : 0}% included tests. ${eng.revertCount === 0 ? "Zero reverts." : `${eng.revertCount} revert(s).`}`,
      },
      scopeReach: {
        score: Math.round(
          scored.find((s) => s.login === eng.login)!.scope * 100
        ),
        metrics: {
          codebaseZonesTouched: eng.allZones.size,
          zones: [...eng.allZones].join(", "),
          criticalPathRatio: `${eng.totalFiles > 0 ? Math.round((eng.criticalPathFiles / eng.totalFiles) * 100) : 0}%`,
          crossStack: eng.touchedFrontend && eng.touchedBackend,
        },
        explanation: `Touched ${eng.allZones.size} codebase zones: ${[...eng.allZones].slice(0, 5).join(", ")}${eng.allZones.size > 5 ? "..." : ""}. ${eng.touchedFrontend && eng.touchedBackend ? "Full-stack contributor (frontend + backend)." : ""} ${eng.totalFiles > 0 ? Math.round((eng.criticalPathFiles / eng.totalFiles) * 100) : 0}% of files in critical infrastructure paths.`,
      },
      consistency: {
        score: Math.round(
          scored.find((s) => s.login === eng.login)!.consistency * 100
        ),
        metrics: {
          activeWeeks: eng.weeklyActivity.size,
          totalWeeks: totalWeeks,
          longestStreak: streaks[activeEngineers.indexOf(eng)],
          contributionEntropy:
            Math.round(entropies[activeEngineers.indexOf(eng)] * 100) / 100,
          recentActivityRatio: `${Math.round(lateWindowActivities[activeEngineers.indexOf(eng)] * 100)}%`,
        },
        explanation: `Active in ${eng.weeklyActivity.size} of ${totalWeeks} weeks. Longest streak: ${streaks[activeEngineers.indexOf(eng)]} consecutive weeks. Activity distribution entropy: ${(entropies[activeEngineers.indexOf(eng)] * 100).toFixed(0)}% (higher = more consistent).`,
      },
    };
  }

  const topEngineers = topScored.map((s, rank) => {
    const eng = activeEngineers[s.index];
    const dims = formatDimensionMetrics(eng, s.index);

    // Top 3 notable PRs by complexity
    const notable = eng.notablePRs
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 3)
      .map((pr) => ({
        number: pr.number,
        title: pr.title,
        url: `https://github.com/${OWNER}/${REPO}/pull/${pr.number}`,
        mergedAt: pr.mergedAt,
        additions: pr.additions,
        deletions: pr.deletions,
        filesChanged: pr.filesChanged,
        zones: pr.zones,
      }));

    return {
      login: eng.login,
      avatarUrl: eng.avatarUrl,
      name: eng.name,
      rank: rank + 1,
      compositeScore: Math.round(s.composite * 100),
      dimensions: dims,
      notablePRs: notable,
    };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    periodStart,
    periodEnd,
    totalPRsAnalyzed: allPRs.length,
    totalEngineersAnalyzed: activeEngineers.length,
    topEngineers,
  };

  const outPath = resolve(__dirname, "../src/data/impact-data.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n🎉 Results written to ${outPath}`);
  console.log(`\nTop ${TOP_N} engineers:`);
  topEngineers.forEach((e) => {
    console.log(
      `  #${e.rank} ${e.name} (@${e.login}) - Score: ${e.compositeScore}`
    );
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
