"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DimensionKey, DimensionScore, DIMENSION_INFO } from "@/lib/types";

interface DimensionBreakdownProps {
  dimensionKey: DimensionKey;
  dimension: DimensionScore;
}

export function DimensionBreakdown({
  dimensionKey,
  dimension,
}: DimensionBreakdownProps) {
  const [expanded, setExpanded] = useState(false);
  const info = DIMENSION_INFO[dimensionKey];

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-2 px-1 hover:bg-card-hover/50 rounded transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-muted shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-muted shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {info.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">
                {Math.round(info.weight * 100)}% weight
              </span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: info.color }}
              >
                {dimension.score}
              </span>
            </div>
          </div>
          <div className="mt-1 h-1.5 bg-border/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${dimension.score}%`,
                backgroundColor: info.color,
              }}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="pl-6 pb-3 space-y-2">
          <p className="text-xs text-muted leading-relaxed">
            {dimension.explanation}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(dimension.metrics).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted">
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (s) => s.toUpperCase())
                    .trim()}
                </span>
                <span className="text-foreground font-medium tabular-nums">
                  {typeof value === "boolean"
                    ? value ? "Yes" : "No"
                    : typeof value === "number"
                    ? value.toLocaleString()
                    : String(value)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted/60 italic">{info.description}</p>
        </div>
      )}
    </div>
  );
}
