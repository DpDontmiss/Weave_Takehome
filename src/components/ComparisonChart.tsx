"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { DimensionKey, DIMENSION_INFO, EngineerProfile } from "@/lib/types";

interface ComparisonChartProps {
  engineers: EngineerProfile[];
}

export function ComparisonChart({ engineers }: ComparisonChartProps) {
  const data = engineers.map((eng) => ({
    name: eng.name.split(" ")[0],
    login: eng.login,
    ...Object.fromEntries(
      (Object.keys(DIMENSION_INFO) as DimensionKey[]).map((key) => [
        key,
        eng.dimensions[key].score,
      ])
    ),
  }));

  const dimensions = Object.keys(DIMENSION_INFO) as DimensionKey[];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={1} barCategoryGap="20%">
        <XAxis
          dataKey="name"
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            background: "#1a1d27",
            border: "1px solid #2a2e3e",
            borderRadius: 8,
            color: "#e5e7eb",
            fontSize: 12,
          }}
          formatter={(value: unknown, name: unknown) => {
            const key = name as DimensionKey;
            const label = DIMENSION_INFO[key]?.label || String(name);
            return [`${value}`, label];
          }}
        />
        {dimensions.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="a"
            fill={DIMENSION_INFO[key].color}
            radius={key === "consistency" ? [2, 2, 0, 0] : [0, 0, 0, 0]}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
