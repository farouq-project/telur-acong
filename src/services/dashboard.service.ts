import { getTodayProduction, getMonthlyProduction, getProductionTrend, getProductionTrendByHouse, getDailyMetrics, getTodayCrackedEggs, getProductionReportByHouse, getEggFlowByDay } from "./production.service";
import { getTodaySales, getMonthlySales, getSalesTrend, getEggSalesByType, getSalesReportByCustomer } from "./sales.service";
import { getEggStock, getFeedStock } from "./stock.service";
import { getTodayMortality, getMonthlyMortality, getMortalityTrend } from "./mortality.service";
import { getUpcomingVaccinations } from "./vaccination.service";
import { getHouses } from "./house.service";

export async function getDashboardStats(reportRange?: { from?: string; to?: string }, salesRange?: { from?: string; to?: string }) {
  const [
    eggStock,
    todayProduction,
    todaySales,
    todayMortality,
    monthlyProduction,
    monthlySales,
    monthlyMortality,
    upcomingVaccinations,
    productionTrend,
    productionByHouse,
    salesTrend,
    mortalityTrend,
    feedStocks,
    dailyMetrics,
    houses,
    todayCrackedEggs,
    houseReport,
    eggSalesByType,
    eggFlow,
    salesReport,
  ] = await Promise.all([
    getEggStock(),
    getTodayProduction(),
    getTodaySales(),
    getTodayMortality(),
    getMonthlyProduction(),
    getMonthlySales(),
    getMonthlyMortality(),
    getUpcomingVaccinations(7),
    getProductionTrend(30),
    getProductionTrendByHouse(90),
    getSalesTrend(30),
    getMortalityTrend(30),
    getFeedStock(),
    getDailyMetrics(reportRange),
    getHouses(),
    getTodayCrackedEggs(),
    getProductionReportByHouse(reportRange),
    getEggSalesByType(reportRange),
    getEggFlowByDay(reportRange),
    getSalesReportByCustomer(salesRange),
  ]);

  // Compute per-house metric averages from dailyMetrics (same date range, proven computation).
  const metricAcc = new Map<string, { fcr: number[]; hd: number[]; fi: number[] }>();
  for (const m of dailyMetrics) {
    if (!metricAcc.has(m.house)) metricAcc.set(m.house, { fcr: [], hd: [], fi: [] });
    const acc = metricAcc.get(m.house)!;
    if (m.fcr != null) acc.fcr.push(m.fcr);
    if (m.hd != null) acc.hd.push(m.hd);
    if (m.feedIntake != null) acc.fi.push(m.feedIntake);
  }
  const avgOf = (arr: number[], decimals: number) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10 ** decimals) / 10 ** decimals : null;

  const enrichedHouseReport = houseReport.map((h) => {
    const m = metricAcc.get(h.house) ?? { fcr: [], hd: [], fi: [] };
    return { ...h, fcr: avgOf(m.fcr, 3), hd: avgOf(m.hd, 2), feedIntake: avgOf(m.fi, 3) };
  });

  const totalTelurBagusKg = enrichedHouseReport.reduce((sum, h) => sum + h.telurBagusKg, 0);
  const totalTelurRetakKg = enrichedHouseReport.reduce((sum, h) => sum + h.telurRetakKg, 0);

  const stokTelurBagus = Math.max(0, totalTelurBagusKg - eggSalesByType.telurBagusKg);
  const stokTelurRetak = Math.max(0, totalTelurRetakKg - eggSalesByType.telurRetakKg);

  return {
    eggStock,
    todayProduction,
    todaySales,
    todayMortality,
    monthlyProduction,
    monthlySales,
    monthlyMortality,
    upcomingVaccinations,
    productionTrend,
    productionByHouse,
    salesTrend,
    mortalityTrend,
    feedStocks,
    dailyMetrics,
    todayCrackedEggs,
    houseNames: houses.map((h) => h.name),
    houseReport: enrichedHouseReport,
    jualBagusKg: eggSalesByType.telurBagusKg,
    jualRetakKg: eggSalesByType.telurRetakKg,
    stokTelurBagus,
    stokTelurRetak,
    eggFlow,
    salesReport,
  };
}
