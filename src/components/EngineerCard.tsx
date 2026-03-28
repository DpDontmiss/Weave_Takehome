"use client";

import { useState } from "react";
import { ExternalLink, Trophy, Medal, Award } from "lucide-react";
import { DimensionKey, DIMENSION_INFO, EngineerProfile } from "@/lib/types";
import { RadarChart } from "./RadarChart";
import { DimensionBreakdown } from "./DimensionBreakdown";

interface EngineerCardProps {
  engineer: EngineerProfile;
}

const RANK_STYLES: Record<
  number,
  { icon: typeof Trophy; gradient: string; badge: string }
> = {
  1: {
    icon: Trophy,
    gradient: "from-yellow-500/20 to-amber-600/5",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  2: {
    icon: Medal,
    gradient: "from-slate-400/15 to-slate-500/5",
    badge: "bg-slate-400/20 text-slate-300 border-slate-400/30",
  },
  3: {
    icon: Award,
    gradient: "from-orange-600/15 to-orange-700/5",
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
};

export function EngineerCard({ engineer }: EngineerCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const rankStyle = RANK_STYLES[engineer.rank];
  const RankIcon = rankStyle?.icon;

  return (
    <div
      className={`bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 ${
        engineer.rank <= 3 ? `bg-gradient-to-br ${rankStyle?.gradient}` : ""
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Rank */}
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
              rankStyle?.badge || "bg-border text-muted border-border"
            } border text-sm font-bold`}
          >
            {RankIcon ? <RankIcon size={16} /> : `#${engineer.rank}`}
          </div>

          {/* Avatar + Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={engineer.avatarUrl}
                alt={engineer.name}
                className="w-8 h-8 rounded-full border border-border"
              />
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">
                  {engineer.name}
                </h3>
                <a
                  href={`https://github.com/${engineer.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted hover:text-accent transition-colors"
                >
                  @{engineer.login}
                </a>
              </div>
            </div>
          </div>

          {/* Composite Score */}
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-accent tabular-nums">
              {engineer.compositeScore}
            </div>
            <div className="text-[10px] text-muted uppercase tracking-wider">
              impact
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="mt-2 -mx-2">
          <RadarChart engineer={engineer} size={180} />
        </div>

        {/* Quick dimension bars */}
        <div className="space-y-1.5 mt-1">
          {(Object.keys(DIMENSION_INFO) as DimensionKey[]).map((key) => {
            const info = DIMENSION_INFO[key];
            const score = engineer.dimensions[key].score;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] text-muted w-20 shrink-0 truncate">
                  {info.label}
                </span>
                <div className="flex-1 h-1.5 bg-border/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${score}%`,
                      backgroundColor: info.color,
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-medium tabular-nums w-6 text-right"
                  style={{ color: info.color }}
                >
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expand/Collapse Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-4 py-2 bg-card-hover/30 hover:bg-card-hover/60 text-xs text-muted hover:text-foreground transition-colors border-t border-border/50"
      >
        {showDetails ? "Hide Details" : "Show Details & Evidence"}
      </button>

      {/* Expanded Details */}
      {showDetails && (
        <div className="border-t border-border/50">
          {/* Dimension Breakdowns */}
          <div className="px-4 py-2">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Dimension Breakdown
            </h4>
            {(Object.keys(DIMENSION_INFO) as DimensionKey[]).map((key) => (
              <DimensionBreakdown
                key={key}
                dimensionKey={key}
                dimension={engineer.dimensions[key]}
              />
            ))}
          </div>

          {/* Notable PRs */}
          {engineer.notablePRs.length > 0 && (
            <div className="px-4 py-3 border-t border-border/50">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Notable Pull Requests
              </h4>
              <div className="space-y-2">
                {engineer.notablePRs.map((pr) => (
                  <a
                    key={pr.number}
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <ExternalLink
                        size={12}
                        className="text-muted group-hover:text-accent mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-foreground group-hover:text-accent truncate">
                          #{pr.number}: {pr.title}
                        </p>
                        <div className="flex gap-3 mt-0.5">
                          <span className="text-[10px] text-green-400">
                            +{pr.additions}
                          </span>
                          <span className="text-[10px] text-red-400">
                            -{pr.deletions}
                          </span>
                          <span className="text-[10px] text-muted">
                            {pr.filesChanged} files
                          </span>
                          {pr.zones.length > 0 && (
                            <span className="text-[10px] text-muted">
                              {pr.zones.slice(0, 2).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
