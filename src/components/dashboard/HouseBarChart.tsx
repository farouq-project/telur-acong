"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HouseMetric } from "@/types";

interface Props {
  title: string;
  data: HouseMetric[];
  dataKey: keyof HouseMetric;
  color: string;
  unit: string;
}

export function HouseBarChart({ title, data, dataKey, color, unit }: Props) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    house: d.house,
    value: d[dataKey] as number,
  }));

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-1 pb-4">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 16, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="house"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "12px",
              }}
              formatter={(value) => [`${value} ${unit}`, "Nilai"]}
            />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
