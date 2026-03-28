"use client";

import { DashboardData, DIMENSION_INFO, DimensionKey } from "@/lib/types";
import { EngineerCard } from "./EngineerCard";
import { ComparisonChart } from "./ComparisonChart";
import { MethodologyModal } from "./MethodologyModal";
import { Calendar, Users, GitPullRequest, BarChart3 } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 size={22} className="text-accent" />
                PostHog Engineering Impact
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Calendar size={12} />
                  {formatDate(data.periodStart)} &ndash;{" "}
                  {formatDate(data.periodEnd)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <GitPullRequest size={12} />
                  {data.totalPRsAnalyzed.toLocaleString()} PRs analyzed
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Users size={12} />
                  {data.totalEngineersAnalyzed} engineers evaluated
                </span>
              </div>
            </div>
            <MethodologyModal />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Comparison Chart */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">
            Dimension Comparison
          </h2>
          <p className="text-xs text-muted mb-3">
            Stacked scores across five impact dimensions. Each bar segment
            represents a different dimension of engineering impact.
          </p>
          <div className="flex flex-wrap gap-3 mb-3">
            {(Object.keys(DIMENSION_INFO) as DimensionKey[]).map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: DIMENSION_INFO[key].color }}
                />
                <span className="text-[10px] text-muted">
                  {DIMENSION_INFO[key].label} ({Math.round(DIMENSION_INFO[key].weight * 100)}%)
                </span>
              </div>
            ))}
          </div>
          <ComparisonChart engineers={data.topEngineers} />
        </div>

        {/* Engineer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {data.topEngineers.map((engineer) => (
            <EngineerCard key={engineer.login} engineer={engineer} />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-8 pb-6 text-center">
          <p className="text-xs text-muted/50">
            Data sourced from{" "}
            <a
              href="https://github.com/PostHog/posthog"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              github.com/PostHog/posthog
            </a>
            {" "}&middot; Generated {formatDate(data.generatedAt)}
            {" "}&middot; Impact scores are relative to the analyzed cohort, not absolute
          </p>
        </footer>
      </main>
    </div>
  );
}
