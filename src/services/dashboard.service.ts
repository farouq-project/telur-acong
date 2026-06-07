import { getTodayProduction, getMonthlyProduction, getProductionTrend, getHouseMetrics } from "./production.service";
import { getTodaySales, getMonthlySales, getSalesTrend } from "./sales.service";
import { getEggStock, getFeedStock } from "./stock.service";
import { getTodayMortality, getMonthlyMortality, getMortalityTrend } from "./mortality.service";
import { getUpcomingVaccinations } from "./vaccination.service";

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
    salesTrend,
    mortalityTrend,
    feedStocks,
    houseMetrics,
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
    getSalesTrend(30),
    getMortalityTrend(30),
    getFeedStock(),
    getHouseMetrics(30),
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
    salesTrend,
    mortalityTrend,
    feedStocks,
    houseMetrics,
  };
}
