"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { DimensionKey, DIMENSION_INFO, EngineerProfile } from "@/lib/types";

interface RadarChartProps {
  engineer: EngineerProfile;
  size?: number;
}

export function RadarChart({ engineer, size = 200 }: RadarChartProps) {
  const data = (Object.keys(DIMENSION_INFO) as DimensionKey[]).map((key) => ({
    dimension: DIMENSION_INFO[key].label.replace(" & ", "\n& "),
    score: engineer.dimensions[key].score,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#2a2e3e" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "#6b7280", fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{
            background: "#1a1d27",
            border: "1px solid #2a2e3e",
            borderRadius: 8,
            color: "#e5e7eb",
            fontSize: 12,
          }}
          formatter={(value: unknown) => [`${value}/100`, "Score"]}
        />
        <Radar
          name="Impact"
          dataKey="score"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
