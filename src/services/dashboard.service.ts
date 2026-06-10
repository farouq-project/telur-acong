import { getTodayProduction, getMonthlyProduction, getProductionTrend, getProductionTrendByHouse, getDailyMetrics, getTodayCrackedEggs, getProductionReportByHouse } from "./production.service";
import { getTodaySales, getMonthlySales, getSalesTrend, getEggSalesByType } from "./sales.service";
import { getEggStock, getFeedStock } from "./stock.service";
import { getTodayMortality, getMonthlyMortality, getMortalityTrend } from "./mortality.service";
import { getUpcomingVaccinations } from "./vaccination.service";
import { getHouses } from "./house.service";

export async function getDashboardStats() {
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
    getDailyMetrics(),
    getHouses(),
    getTodayCrackedEggs(),
    getProductionReportByHouse(),
    getEggSalesByType(),
  ]);

  const totalTelurBagusKg = houseReport.reduce((sum, h) => sum + h.telurBagusKg, 0);
  const totalTelurRetakKg = houseReport.reduce((sum, h) => sum + h.telurRetakKg, 0);

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
    houseReport,
    jualBagusKg: eggSalesByType.telurBagusKg,
    jualRetakKg: eggSalesByType.telurRetakKg,
    stokTelurBagus,
    stokTelurRetak,
  };
}
