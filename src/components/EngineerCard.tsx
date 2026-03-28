"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { DimensionKey, DIMENSION_INFO, EngineerProfile } from "@/lib/types";
import { DimensionBreakdown } from "./DimensionBreakdown";

interface EngineerCardProps {
  engineer: EngineerProfile;
  rank: number;
}

const RANK_COLORS: Record<number, string> = {
  1: "from-yellow-500/30 via-yellow-600/10 to-transparent border-yellow-500/40",
  2: "from-slate-400/20 via-slate-500/5 to-transparent border-slate-400/30",
  3: "from-orange-500/20 via-orange-600/5 to-transparent border-orange-500/30",
};

const RANK_BADGES: Record<number, string> = {
  1: "bg-yellow-500/20 text-yellow-300",
  2: "bg-slate-400/20 text-slate-300",
  3: "bg-orange-500/20 text-orange-300",
};

export function EngineerCard({ engineer, rank }: EngineerCardProps) {
  const [showMetrics, setShowMetrics] = useState(false);
  const isTop3 = rank <= 3;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        isTop3
          ? `bg-gradient-to-b ${RANK_COLORS[rank]}`
          : "bg-card border-border"
      }`}
    >
      {/* ── Top: Identity + Summary (always visible) ─────────────── */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          {/* Rank Badge */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              RANK_BADGES[rank] || "bg-border text-muted"
            }`}
          >
            {rank}
          </div>

          {/* Avatar + Name */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={engineer.avatarUrl}
            alt={engineer.name}
            className="w-10 h-10 rounded-full border border-border shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground text-sm leading-tight">
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

        {/* ── Summary: the WHY in plain English ──────────────────── */}
        <p className="text-[13px] text-foreground/80 leading-relaxed mb-4">
          {engineer.summary}
        </p>

        {/* ── Dimension bars with inline headlines ───────────────── */}
        <div className="space-y-3">
          {(Object.keys(DIMENSION_INFO) as DimensionKey[]).map((key) => {
            const info = DIMENSION_INFO[key];
            const dim = engineer.dimensions[key];
            const isStrength = key === engineer.topStrength;

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`text-xs font-medium ${
                      isStrength ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {info.label}
                    {isStrength && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold uppercase">
                        strongest
                      </span>
                    )}
                  </span>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: info.color }}
                  >
                    {dim.score}
                  </span>
                </div>
                <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${dim.score}%`,
                      backgroundColor: info.color,
                      opacity: isStrength ? 1 : 0.7,
                    }}
                  />
                </div>
                {/* Inline headline - the key insight */}
                <p className="text-[10px] text-muted mt-0.5 leading-snug">
                  {dim.headline}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Notable PRs (always visible - this IS the evidence) ── */}
      {engineer.notablePRs.length > 0 && (
        <div className="px-5 pb-3 border-t border-border/40 pt-3">
          <h4 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
            Notable PRs
          </h4>
          <div className="space-y-1.5">
            {engineer.notablePRs.map((pr) => (
              <a
                key={pr.number}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-1.5 group"
              >
                <ExternalLink
                  size={10}
                  className="text-muted group-hover:text-accent mt-0.5 shrink-0"
                />
                <span className="text-[11px] text-foreground/70 group-hover:text-accent leading-snug line-clamp-1">
                  {pr.title}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Expandable deep-dive metrics ─────────────────────────── */}
      <button
        onClick={() => setShowMetrics(!showMetrics)}
        className="w-full px-5 py-2 bg-card-hover/20 hover:bg-card-hover/40 text-[11px] text-muted hover:text-foreground transition-colors border-t border-border/30 flex items-center justify-center gap-1"
      >
        {showMetrics ? (
          <ChevronDown size={12} />
        ) : (
          <ChevronRight size={12} />
        )}
        {showMetrics ? "Hide" : "Show"} detailed metrics
      </button>

      {showMetrics && (
        <div className="px-5 py-3 border-t border-border/30">
          {(Object.keys(DIMENSION_INFO) as DimensionKey[]).map((key) => (
            <DimensionBreakdown
              key={key}
              dimensionKey={key}
              dimension={engineer.dimensions[key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
