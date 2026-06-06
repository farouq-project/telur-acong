import { unstable_cache } from "next/cache";
import { getDashboardStats } from "@/services/dashboard.service";
import { getEggStock, getFeedStock } from "@/services/stock.service";

export const getCachedDashboardStats = unstable_cache(
  getDashboardStats,
  ["dashboard-stats"],
  { revalidate: 30 }
);

export const getCachedEggStock = unstable_cache(
  getEggStock,
  ["egg-stock"],
  { revalidate: 30 }
);

export const getCachedFeedStock = unstable_cache(
  getFeedStock,
  ["feed-stock"],
  { revalidate: 30 }
);
