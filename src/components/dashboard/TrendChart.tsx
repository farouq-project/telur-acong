"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

interface TrendChartProps {
  title: string;
  data: { date: string; value: number }[];
  color: string;
  unit: string;
}

export function TrendChart({ title, data, color, unit }: TrendChartProps) {
  if (!data || data.length === 0) return null;

  const formattedData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MM", { locale: id }),
  }));

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-1 pb-4">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart
            data={formattedData}
            margin={{ top: 4, right: 16, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
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
              formatter={(value) => [`${value} ${unit}`, "Jumlah"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
