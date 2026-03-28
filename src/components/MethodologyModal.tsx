"use client";

import { useState } from "react";
import { X, Info } from "lucide-react";
import { DIMENSION_INFO, DimensionKey } from "@/lib/types";

export function MethodologyModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        data-methodology-btn
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-card-hover border border-border rounded-lg text-xs text-muted hover:text-foreground transition-colors"
      >
        <Info size={14} />
        How Impact is Calculated
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-foreground">
                Scoring Methodology
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-card-hover rounded-lg transition-colors"
              >
                <X size={18} className="text-muted" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Philosophy */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Philosophy
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Impact = how much an engineer makes the product better AND
                  makes other engineers more effective. Lines of code, commit
                  counts, and files changed are deliberately excluded as primary
                  signals. The model measures shipping discipline, review quality,
                  code craftsmanship, architectural breadth, and sustained
                  engagement.
                </p>
              </div>

              {/* The Formula */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Composite Score Formula
                </h3>
                <div className="bg-background/50 border border-border/50 rounded-lg p-3 font-mono text-xs text-foreground/80 leading-relaxed">
                  <p className="mb-2">
                    <span className="text-accent font-semibold">impact</span> =
                    0.30 &times; shipping + 0.25 &times; teamMultiplier + 0.20
                    &times; quality + 0.15 &times; scope + 0.10 &times;
                    consistency
                  </p>
                  <p className="text-muted text-[10px]">
                    Each dimension is scored 0&ndash;100 via min-max
                    normalization across all 28 qualifying engineers. The final
                    composite is also scaled to 0&ndash;100.
                  </p>
                </div>
              </div>

              {/* Dimensions with sub-formulas */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Dimension Breakdown
                </h3>
                <div className="space-y-4">
                  {(Object.keys(DIMENSION_INFO) as DimensionKey[]).map(
                    (key) => {
                      const info = DIMENSION_INFO[key];
                      return (
                        <div key={key} className="flex gap-3">
                          <div
                            className="w-1 shrink-0 rounded-full"
                            style={{ backgroundColor: info.color }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-foreground">
                                {info.label}
                              </h4>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-border text-muted">
                                {Math.round(info.weight * 100)}% weight
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-1 leading-relaxed">
                              {info.description}
                            </p>
                            <div className="mt-1.5 bg-background/30 border border-border/30 rounded px-2 py-1.5 font-mono text-[10px] text-foreground/60">
                              {key === "shippingLeverage" &&
                                "= 0.30×mergeRate + 0.25×zoneCrossings + 0.20×workTypeWeight + 0.15×(1/timeToMerge) + 0.10×mergedCount"}
                              {key === "teamMultiplier" &&
                                "= (0.25×substantiveRatio + 0.20×commentDepth + 0.20×authorDiversity + 0.15×bellCurve(crRate, 0.22) + 0.10×(1/turnaround) + 0.10×reviewCount) × (1 + 0.30×pageRank)"}
                              {key === "qualitySignal" &&
                                "= 0.30×firstPassRate + 0.25×(1−revertRate) + 0.20×testRate + 0.15×(1/friction) + 0.10×descLength"}
                              {key === "scopeReach" &&
                                "= 0.30×zoneCount + 0.30×criticalPathRatio + 0.20×crossStack + 0.20×issueEngagement"}
                              {key === "consistency" &&
                                "= 0.30×(activeWeeks/13) + 0.30×shannonEntropy + 0.20×(streak/13) + 0.20×bellCurve(recentRatio, 0.33)"}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Novel Signals */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Novel Signals
                </h3>
                <ul className="text-xs text-muted space-y-2 leading-relaxed">
                  <li>
                    <strong className="text-foreground">
                      Review Network PageRank
                    </strong>{" "}
                    &mdash; Builds a directed graph where edge(A&rarr;B) means A
                    reviewed B&apos;s PR. Runs 20 iterations of PageRank (damping
                    = 0.85). Engineers who are structural hubs get up to a 30%
                    bonus on their Team Multiplier score.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Codebase Zone Mapping
                    </strong>{" "}
                    &mdash; Maps each file path to one of 12 architectural zones
                    (Frontend UI, Backend API, HogQL, ClickHouse, Rust Core,
                    etc.). PR complexity = distinct zones spanned, not lines
                    changed. A 50-line PR touching API + HogQL + Tests scores
                    higher than a 2000-line single-zone migration.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Shannon Entropy
                    </strong>{" "}
                    &mdash; H = &minus;&Sigma;(p &times; log2(p)) over weekly
                    contribution counts, normalized to [0,1]. A score of 1.0
                    means perfectly even distribution across weeks; 0.0 means all
                    activity in a single week.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Bell Curve Scoring
                    </strong>{" "}
                    &mdash; Used for changes-requested rate (optimal ~20%) and
                    recent-activity ratio (optimal ~33%). Formula: exp(&minus;(x
                    &minus; center)&sup2; / (2&sigma;&sup2;)). Rewards the
                    healthy middle, penalizes extremes.
                  </li>
                </ul>
              </div>

              {/* What this does NOT measure */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Limitations
                </h3>
                <ul className="text-xs text-muted space-y-1 leading-relaxed list-disc ml-4">
                  <li>
                    Lines of code (a 2000-line migration and a 50-line bugfix are
                    evaluated on zone complexity and type, not size)
                  </li>
                  <li>
                    Slack, meetings, mentorship, design, on-call, incident
                    response
                  </li>
                  <li>
                    Anything outside publicly available GitHub data
                  </li>
                </ul>
                <p className="text-[10px] text-muted/60 mt-2 italic">
                  Real engineering impact extends far beyond what any code metric
                  can capture. These scores are relative to the analyzed cohort,
                  not absolute measures of ability.
                </p>
              </div>

              {/* Data Details */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Data Pipeline
                </h3>
                <ul className="text-xs text-muted space-y-1 leading-relaxed list-disc ml-4">
                  <li>
                    GitHub GraphQL API &rarr; 7,956 PRs fetched with files,
                    reviews, labels
                  </li>
                  <li>
                    Filtered to org members/collaborators with &ge;3 merged PRs
                    and &ge;2 active weeks
                  </li>
                  <li>
                    Bots excluded (dependabot, renovate, github-actions, *[bot])
                  </li>
                  <li>
                    28 engineers qualified &rarr; per-dimension min-max
                    normalization &rarr; weighted composite
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
