import { getTodayProduction, getMonthlyProduction, getProductionTrend, getProductionTrendByHouse, getDailyMetrics } from "./production.service";
import { getTodaySales, getMonthlySales, getSalesTrend } from "./sales.service";
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
    getDailyMetrics(90),
    getHouses(),
  ]);

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
    houseNames: houses.map((h) => h.name),
  };
}
