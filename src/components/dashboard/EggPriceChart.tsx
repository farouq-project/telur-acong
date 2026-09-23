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
const AXIS_TICK_STYLE = { fontSize: 11, fill: "#1f2937", fontWeight: 700 };

function formatRupiahPerKg(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}/kg`;
}

export function EggPriceChart({ title, data }: Props) {
  if (!data || data.length === 0) return null;

  const formattedData = data.map((d) => ({
    ...d,
    label: format(parseISO(`${d.month}-01`), "MMM yy", { locale: id }),
  }));

  const actualPrices = data.filter((d) => !d.isForecast).map((d) => d.avgPrice);
  const highest = actualPrices.length > 0 ? Math.max(...actualPrices) : null;
  const lowest = actualPrices.length > 0 ? Math.min(...actualPrices) : null;
  const average = actualPrices.length > 0
    ? Math.round((actualPrices.reduce((a, b) => a + b, 0) / actualPrices.length) * 100) / 100
    : null;

  // Zoom the Y axis to the data's own range (rounded to the nearest 1.000) instead of
  // starting from 0, so month-to-month price movement is actually visible on the bars.
  const allPrices = formattedData.map((d) => d.avgPrice);
  const dataMin = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const dataMax = allPrices.length > 0 ? Math.max(...allPrices) : 0;
  const yAxisMin = Math.floor(dataMin / 1000) * 1000;
  let yAxisMax = Math.ceil(dataMax / 1000) * 1000;
  if (yAxisMax <= yAxisMin) yAxisMax = yAxisMin + 1000;

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
      <CardContent className="px-4 pb-4">
        {(highest != null || lowest != null || average != null) && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg bg-red-50 border border-red-100 px-2 py-2 text-center">
              <p className="text-[10px] text-red-500 font-medium">Harga Tertinggi</p>
              <p className="text-xs font-bold text-red-700 mt-0.5">{highest != null ? formatRupiahPerKg(highest) : "–"}</p>
            </div>
            <div className="rounded-lg bg-green-50 border border-green-100 px-2 py-2 text-center">
              <p className="text-[10px] text-green-600 font-medium">Harga Terendah</p>
              <p className="text-xs font-bold text-green-700 mt-0.5">{lowest != null ? formatRupiahPerKg(lowest) : "–"}</p>
            </div>
            <div className="rounded-lg bg-purple-50 border border-purple-100 px-2 py-2 text-center">
              <p className="text-[10px] text-purple-500 font-medium">Harga Rata-rata</p>
              <p className="text-xs font-bold text-purple-700 mt-0.5">{average != null ? formatRupiahPerKg(average) : "–"}</p>
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={formattedData} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK_STYLE}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              tick={AXIS_TICK_STYLE}
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
                formatRupiahPerKg(value),
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
