"use client";

import { useState } from "react";
import { X, Info } from "lucide-react";
import { DIMENSION_INFO, DimensionKey } from "@/lib/types";

export function MethodologyModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-card-hover border border-border rounded-lg text-xs text-muted hover:text-foreground transition-colors"
      >
        <Info size={14} />
        How Impact is Calculated
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                Impact Scoring Methodology
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
                  counts, and files changed do NOT define impact. Instead, this
                  model measures: shipping discipline, review quality, code
                  craftsmanship, architectural breadth, and sustained engagement.
                </p>
              </div>

              {/* Dimensions */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Five Dimensions of Impact
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
                          <div>
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
                  Novel Analytical Signals
                </h3>
                <ul className="text-xs text-muted space-y-2 leading-relaxed">
                  <li>
                    <strong className="text-foreground">
                      Review Network PageRank
                    </strong>{" "}
                    &mdash; Treats the code review graph as a network and computes
                    PageRank centrality. Engineers who are structural &quot;hubs&quot;
                    in the review network (everyone relies on them) get a bonus.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Codebase Zone Mapping
                    </strong>{" "}
                    &mdash; Instead of counting files, maps each file to architectural
                    zones (Frontend UI, Backend API, HogQL, ClickHouse, Rust Core,
                    etc.). PR complexity = how many zones it spans.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Shannon Entropy for Consistency
                    </strong>{" "}
                    &mdash; Uses information theory to measure how evenly distributed
                    contributions are across weeks, rather than just counting active
                    days.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Bell Curve for Review Pushback
                    </strong>{" "}
                    &mdash; The &quot;changes requested&quot; rate uses a bell curve
                    centered at ~20%. Neither rubber-stamping (0%) nor constant
                    pushback (100%) is ideal.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Critical Path Ratio
                    </strong>{" "}
                    &mdash; Identifies work on core infrastructure (HogQL, ClickHouse,
                    Rust) vs. peripheral changes. Infrastructure work has outsized
                    impact but is often invisible.
                  </li>
                </ul>
              </div>

              {/* What this does NOT measure */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  What This Does NOT Measure
                </h3>
                <ul className="text-xs text-muted space-y-1 leading-relaxed list-disc ml-4">
                  <li>
                    Lines of code (a 2000-line auto-migration and a 50-line
                    critical bugfix are evaluated on complexity and type, not
                    size)
                  </li>
                  <li>
                    Raw commit count (used only as a 10% tiebreaker within
                    Shipping Leverage)
                  </li>
                  <li>
                    Slack messages, meetings, or non-GitHub contributions
                  </li>
                  <li>
                    Design decisions, product thinking, or mentorship outside of
                    code review
                  </li>
                  <li>
                    On-call work, incident response, or operational excellence
                  </li>
                </ul>
                <p className="text-[10px] text-muted/60 mt-2 italic">
                  This analysis uses only publicly available GitHub data. Real
                  engineering impact extends far beyond what any code metric can
                  capture.
                </p>
              </div>

              {/* Data Details */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Data & Filtering
                </h3>
                <ul className="text-xs text-muted space-y-1 leading-relaxed list-disc ml-4">
                  <li>Data source: GitHub GraphQL API (PostHog/posthog repository)</li>
                  <li>Time window: Last 90 days</li>
                  <li>
                    Included: Org members and collaborators with 3+ merged PRs
                    and 2+ active weeks
                  </li>
                  <li>
                    Excluded: Bots (dependabot, renovate, etc.) and external
                    contributors
                  </li>
                  <li>
                    Normalization: Min-max across the cohort (0-100 scale per
                    dimension)
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
