"use client";

import { DashboardData, DIMENSION_INFO, DimensionKey } from "@/lib/types";
import { EngineerCard } from "./EngineerCard";
import { MethodologyModal } from "./MethodologyModal";
import {
  Calendar,
  Users,
  GitPullRequest,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface DashboardProps {
  data: DashboardData;
}

export function Dashboard({ data }: DashboardProps) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const dimKeys = Object.keys(DIMENSION_INFO) as DimensionKey[];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BarChart3 size={20} className="text-accent" />
                PostHog Engineering Impact
              </h1>
              <div className="flex items-center gap-4 mt-0.5">
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Calendar size={11} />
                  {formatDate(data.periodStart)} &ndash;{" "}
                  {formatDate(data.periodEnd)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <GitPullRequest size={11} />
                  {data.totalPRsAnalyzed.toLocaleString()} PRs
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Users size={11} />
                  {data.totalEngineersAnalyzed} engineers
                </span>
              </div>
            </div>
            <MethodologyModal />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
        {/* At-a-glance comparison table */}
        <div className="bg-card border border-border rounded-xl p-4 mb-5 overflow-x-auto">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-foreground">
              At a Glance
            </h2>
            <span className="text-xs text-muted">
              &mdash; scores are relative to the 28-engineer cohort (0&ndash;100
              per dimension)
            </span>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 pr-4 text-muted font-medium w-48">
                  Engineer
                </th>
                {dimKeys.map((key) => (
                  <th
                    key={key}
                    className="text-center py-2 px-2 font-medium"
                    style={{ color: DIMENSION_INFO[key].color }}
                  >
                    <div className="leading-tight">
                      {DIMENSION_INFO[key].label.split(" ").map((w, i) => (
                        <span key={i}>
                          {w}
                          {i === 0 && DIMENSION_INFO[key].label.includes(" ") ? (
                            <br />
                          ) : null}
                        </span>
                      ))}
                    </div>
                    <span className="text-[9px] text-muted font-normal">
                      {Math.round(DIMENSION_INFO[key].weight * 100)}%
                    </span>
                  </th>
                ))}
                <th className="text-center py-2 pl-3 text-muted font-medium">
                  Differentiator
                </th>
              </tr>
            </thead>
            <tbody>
              {data.topEngineers.map((eng) => (
                <tr
                  key={eng.login}
                  className="border-b border-border/20 last:border-0 hover:bg-card-hover/30 transition-colors"
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-muted font-medium w-4">
                        {eng.rank}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={eng.avatarUrl}
                        alt={eng.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="font-medium text-foreground truncate">
                        {eng.name}
                      </span>
                    </div>
                  </td>
                  {dimKeys.map((key) => {
                    const score = eng.dimensions[key].score;
                    const isStrength = key === eng.topStrength;
                    return (
                      <td key={key} className="text-center py-2.5 px-2">
                        <div className="flex flex-col items-center">
                          <span
                            className={`tabular-nums font-semibold ${
                              isStrength ? "text-sm" : "text-xs"
                            }`}
                            style={{
                              color: isStrength
                                ? DIMENSION_INFO[key].color
                                : undefined,
                            }}
                          >
                            {score}
                          </span>
                          <div className="w-10 h-1 bg-border/40 rounded-full mt-0.5 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${score}%`,
                                backgroundColor: DIMENSION_INFO[key].color,
                                opacity: isStrength ? 1 : 0.5,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2.5 pl-3">
                    <span
                      className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${DIMENSION_INFO[eng.topStrength as DimensionKey]?.color}20`,
                        color: DIMENSION_INFO[eng.topStrength as DimensionKey]?.color,
                      }}
                    >
                      {DIMENSION_INFO[eng.topStrength as DimensionKey]?.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scoring explainer — always visible, not behind a click */}
        <div className="bg-card/50 border border-border/50 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5 w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-[10px] font-bold">f(x)</span>
            </div>
            <div className="text-xs text-muted leading-relaxed">
              <span className="text-foreground font-medium">How scores work:</span>{" "}
              Each engineer is scored 0&ndash;100 on five dimensions, then combined:{" "}
              <span className="font-mono text-foreground/70">
                impact = 0.30&times;Shipping + 0.25&times;TeamMultiplier +
                0.20&times;Quality + 0.15&times;Scope + 0.10&times;Consistency
              </span>
              . Scores are relative to the 28-engineer cohort (min-max normalized), not
              absolute. A score of 70 means &ldquo;top of this group,&rdquo; not &ldquo;70% of some
              ideal.&rdquo;{" "}
              <button
                onClick={() => {
                  document
                    .querySelector("[data-methodology-btn]")
                    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                }}
                className="text-accent hover:text-accent-hover underline underline-offset-2"
              >
                Full methodology &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Engineer Detail Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.topEngineers.map((engineer) => (
            <EngineerCard
              key={engineer.login}
              engineer={engineer}
              rank={engineer.rank}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-6 pb-4 text-center">
          <p className="text-[10px] text-muted/50">
            Data from{" "}
            <a
              href="https://github.com/PostHog/posthog"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              PostHog/posthog
            </a>
            {" "}&middot; Generated {formatDate(data.generatedAt)}
            {" "}&middot; Scores are relative to the analyzed cohort, not
            absolute measures of ability
          </p>
        </footer>
      </main>
    </div>
  );
}
