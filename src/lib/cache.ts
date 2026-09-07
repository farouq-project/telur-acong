import { unstable_cache } from "next/cache";
import { getDashboardStats } from "@/services/dashboard.service";
import { getEggStock } from "@/services/stock.service";
import { getBusinessSettings } from "@/services/business-settings.service";

export const getCachedDashboardStats = unstable_cache(
  getDashboardStats,
  ["dashboard-stats-v4"],
  { revalidate: 30 }
);

export const getCachedEggStock = unstable_cache(
  getEggStock,
  ["egg-stock"],
  { revalidate: 30 }
);

export const getCachedBusinessSettings = unstable_cache(
  getBusinessSettings,
  ["business-settings"],
  { revalidate: 300, tags: ["business-settings"] }
);
