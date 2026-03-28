# PostHog Engineering Impact Dashboard

**Live:** https://posthog-impact-dashboard.netlify.app

Identifies the top 5 most impactful engineers at PostHog over the last 90 days using multi-dimensional analysis of GitHub data.

## Approach

### What "impact" means here

Every engineer knows that counting lines of code doesn't capture impact. This dashboard defines impact across **five dimensions**, each measuring a different way an engineer moves the needle:

| Dimension | Weight | What it captures | Key signals |
|-----------|--------|-----------------|-------------|
| **Shipping Leverage** | 30% | How effectively they ship real work | Merge rate, PR architectural complexity (zone span, not LOC), work type weighting (infra > features > chores), time-to-merge |
| **Team Multiplier** | 25% | How much they amplify others through review | Review depth & substantiveness, author diversity, turnaround time, PageRank centrality in the review network |
| **Quality Signal** | 20% | Whether their code lands cleanly | First-pass merge rate, revert rate, test inclusion, PR description quality |
| **Scope & Reach** | 15% | Breadth and criticality of contributions | Codebase zones touched, critical-path ratio (HogQL, ClickHouse, Rust), cross-stack work |
| **Consistency** | 10% | Sustained output vs. burst activity | Shannon entropy of weekly activity, streak length, recency of contributions |

### How scores are calculated

Each dimension produces a 0–100 score via min-max normalization across the 28-engineer cohort. The composite score is a weighted sum:

```
composite = 0.30 × shipping + 0.25 × teamMultiplier + 0.20 × quality + 0.15 × scope + 0.10 × consistency
```

Each dimension is itself a weighted combination of normalized sub-metrics. For example, Shipping Leverage:

```
shipping = 0.30 × mergeRate + 0.25 × complexitySum + 0.20 × workTypeSum + 0.15 × (1/timeToMerge) + 0.10 × mergedCount
```

### What makes this different from naive metrics

- **PageRank on the review graph** — treats code review as a network; engineers who are structural hubs (everyone relies on them for review) get a bonus
- **Codebase zone mapping** — maps each file to architectural zones (Frontend UI, Backend API, HogQL, ClickHouse, Rust Core, etc.); PR complexity = how many zones it spans, not how many lines it touches
- **Shannon entropy for consistency** — uses information theory to distinguish steady contributors from burst activity
- **Bell curve for review pushback** — a ~20% changes-requested rate is healthy; 0% means rubber-stamping, 100% means combativeness
- **Critical-path ratio** — infrastructure work (HogQL, ClickHouse, Rust) has outsized impact but is often invisible in naive metrics

### What this does NOT measure

- Lines of code or raw commit counts
- Slack conversations, meetings, or mentorship outside of code review
- Design decisions, product thinking, or on-call work
- Anything outside of publicly available GitHub data

## Data

- **Source:** GitHub GraphQL API (`PostHog/posthog` repository)
- **Window:** Last 90 days (7,956 PRs fetched)
- **Included:** Org members and collaborators with ≥3 merged PRs and ≥2 active weeks
- **Excluded:** Bots (dependabot, renovate, github-actions) and external contributors
- **Engineers evaluated:** 28

## Architecture

```
scripts/collect-data.ts    → Fetches PRs/reviews/files via GitHub GraphQL API
                           → Computes raw metrics per engineer
                           → Builds review network, computes PageRank
                           → Normalizes, scores, ranks
                           → Writes src/data/impact-data.json

scripts/enrich-data.ts     → Adds narrative summaries, dimension headlines,
                             and human-friendly metric labels

src/components/            → Next.js dashboard (static export)
  Dashboard.tsx            → At-a-glance comparison table + card grid
  EngineerCard.tsx         → Per-engineer profile with summary, dimensions, evidence
  DimensionBreakdown.tsx   → Expandable metric drill-down
  MethodologyModal.tsx     → Full scoring methodology explanation
```

The dashboard is a **static site** — all data is pre-computed into a JSON file at build time. No API calls at runtime. Loads instantly.

## Tech Stack

- **Framework:** Next.js 16 (App Router, static export)
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Data:** GitHub GraphQL API via `@octokit/graphql`
- **Hosting:** Netlify

## Running Locally

```bash
npm install

# Collect fresh data (requires `gh auth login`)
npm run collect-data
npx tsx scripts/enrich-data.ts

# Dev server
npm run dev

# Build + export
npm run build
```
