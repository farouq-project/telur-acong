import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { DailyMetric } from "@/types";

interface Props {
  title: string;
  data: DailyMetric[];
}

// Rentang wajar berdasarkan standar umum ayam petelur — di luar rentang ini ditandai merah
const FCR_RANGE = { min: 1.8, max: 2.6 };
const HD_RANGE = { min: 65, max: 95 };
const FI_RANGE = { min: 0.085, max: 0.13 };

function isAbnormal(value: number | null, range: { min: number; max: number }) {
  if (value === null) return false;
  return value < range.min || value > range.max;
}

export function DailyMetricsTable({ title, data }: Props) {
  if (!data || data.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm text-gray-700">{title}</CardTitle>
        <p className="text-xs text-gray-400">Angka berwarna merah berarti di luar rentang wajar</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left font-medium py-1.5 px-1">Tanggal</th>
                <th className="text-left font-medium py-1.5 px-1">Kandang</th>
                <th className="text-right font-medium py-1.5 px-1">FCR</th>
                <th className="text-right font-medium py-1.5 px-1">HD</th>
                <th className="text-right font-medium py-1.5 px-1">FI</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 px-1 text-gray-500 whitespace-nowrap">{formatDate(d.date)}</td>
                  <td className="py-2 px-1 font-medium text-gray-700 whitespace-nowrap">{d.house}</td>
                  <td className={`py-2 px-1 text-right ${isAbnormal(d.fcr, FCR_RANGE) ? "text-red-600 font-semibold" : "text-gray-700"}`}>
                    {d.fcr !== null ? d.fcr.toFixed(5) : "–"}
                  </td>
                  <td className={`py-2 px-1 text-right ${isAbnormal(d.hd, HD_RANGE) ? "text-red-600 font-semibold" : "text-gray-700"}`}>
                    {d.hd !== null ? `${d.hd.toFixed(2)}%` : "–"}
                  </td>
                  <td className={`py-2 px-1 text-right ${isAbnormal(d.feedIntake, FI_RANGE) ? "text-red-600 font-semibold" : "text-gray-700"}`}>
                    {d.feedIntake !== null ? d.feedIntake.toFixed(3) : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
