"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

interface EggPricePoint {
  month: string; // "YYYY-MM"
  avgPrice: number;
  isForecast: boolean;
}

interface Props {
  title: string;
  data: EggPricePoint[];
}

const ACTUAL_COLOR = "#7c3aed";
const FORECAST_COLOR = "#ddd6fe";

export function EggPriceChart({ title, data }: Props) {
  if (!data || data.length === 0) return null;

  const formattedData = data.map((d) => ({
    ...d,
    label: format(parseISO(`${d.month}-01`), "MMM yy", { locale: id }),
  }));

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-gray-700">{title}</CardTitle>
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: ACTUAL_COLOR }} />
              Aktual
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: FORECAST_COLOR }} />
              Perkiraan
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-1 pb-4">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={formattedData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
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
              formatter={(value: number, _name, props) => [
                `Rp ${Math.round(value).toLocaleString("id-ID")}/kg`,
                props?.payload?.isForecast ? "Perkiraan" : "Aktual",
              ]}
            />
            <Bar dataKey="avgPrice" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {formattedData.map((d, i) => (
                <Cell key={i} fill={d.isForecast ? FORECAST_COLOR : ACTUAL_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
