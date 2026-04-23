"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface ProgressPoint {
  date: string;
  averageProgress: number;
  activeStudents: number;
}

interface ProgressChartProps {
  data: ProgressPoint[];
}

export function ProgressChart({ data }: ProgressChartProps) {
  return (
    <div className="h-[280px] w-full rounded-xl border border-slate-700/80 bg-slate-900/50 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
          <YAxis yAxisId="left" stroke="#67e8f9" fontSize={12} />
          <YAxis yAxisId="right" orientation="right" stroke="#a78bfa" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#e2e8f0"
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="averageProgress"
            name="Average Progress %"
            stroke="#22d3ee"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#22d3ee" }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="activeStudents"
            name="Active Students"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={{ r: 3, fill: "#a78bfa" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
