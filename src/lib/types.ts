export interface DashboardData {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  totalPRsAnalyzed: number;
  totalEngineersAnalyzed: number;
  topEngineers: EngineerProfile[];
}

export interface EngineerProfile {
  login: string;
  avatarUrl: string;
  name: string;
  rank: number;
  compositeScore: number;
  dimensions: {
    shippingLeverage: DimensionScore;
    teamMultiplier: DimensionScore;
    qualitySignal: DimensionScore;
    scopeReach: DimensionScore;
    consistency: DimensionScore;
  };
  notablePRs: NotablePR[];
}

export interface DimensionScore {
  score: number; // 0-100
  metrics: Record<string, number | string | boolean>;
  explanation: string;
}

export interface NotablePR {
  number: number;
  title: string;
  url: string;
  mergedAt: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  zones: string[];
}

export type DimensionKey = keyof EngineerProfile["dimensions"];

export const DIMENSION_INFO: Record<
  DimensionKey,
  { label: string; weight: number; description: string; color: string }
> = {
  shippingLeverage: {
    label: "Shipping Leverage",
    weight: 0.3,
    description:
      "How effectively they ship real work. Measures merge rate, architectural complexity of PRs, type of work (infra weighted higher than chores), and time-to-merge efficiency.",
    color: "#6366f1",
  },
  teamMultiplier: {
    label: "Team Multiplier",
    weight: 0.25,
    description:
      "How much they amplify others through code review. Measures review depth, author diversity, turnaround time, and centrality in the review network (PageRank).",
    color: "#8b5cf6",
  },
  qualitySignal: {
    label: "Quality Signal",
    weight: 0.2,
    description:
      "Whether their code lands cleanly. Measures first-pass merge rate, test inclusion, review friction, and PR description thoroughness.",
    color: "#ec4899",
  },
  scopeReach: {
    label: "Scope & Reach",
    weight: 0.15,
    description:
      "Breadth and criticality of contributions. Measures codebase zones touched, critical-path work (HogQL, ClickHouse, Rust), and cross-stack contributions.",
    color: "#f59e0b",
  },
  consistency: {
    label: "Consistency",
    weight: 0.1,
    description:
      "Sustained, reliable output over the 90-day window. Uses Shannon entropy to distinguish steady work from burst activity, plus streak length and recency.",
    color: "#10b981",
  },
};
