export type UserRole = "DEVELOPER" | "OWNER" | "STAFF" | "FARM_HEAD" | "QA_HEAD";
export type MedCategory = "MEDICINE" | "VACCINE";
export type NotificationType =
  | "LOW_EGG_STOCK"
  | "LOW_FEED_STOCK"
  | "VACCINATION_DUE"
  | "GENERAL";
export type FinType = "INCOME" | "EXPENSE";

export interface House {
  id: string;
  name: string;
  currentPopulation: number;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface EggProduction {
  id: string;
  date: string;
  house: string;
  populasi?: number | null;
  goodEggs: number;
  crackedEggs: number;
  rejectedEggs: number;
  goodEggsKg?: number | null;
  crackedEggsKg?: number | null;
  rejectedEggsKg?: number | null;
  feedQtyKg?: number | null;
  feedPricePerKg?: number | null;
  feedProductId?: string | null;
  mortality?: number | null;
  umurAyam?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type EggType = "TELUR_BAGUS" | "TELUR_RETAK" | "TELUR_BULE";

export interface EggSale {
  id: string;
  date: string;
  customerName: string;
  invoiceNo?: string | null;
  jatuhTempoDays?: number | null;
  eggType?: EggType | null;
  qtySold: number;
  unitPrice: number;
  totalValue: number;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface FeedProduct {
  id: string;
  name: string;
  unit: string;
  stockQty?: number;
  createdAt: string;
}

export interface FeedPurchase {
  id: string;
  date: string;
  feedProductId: string;
  feedProduct?: FeedProduct;
  qty: number;
  pricePerKg?: number | null;
  totalValue?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface FeedUsage {
  id: string;
  date: string;
  house: string;
  feedProductId: string;
  feedProduct?: FeedProduct;
  qtyUsed: number;
  unitCost?: number | null;
  totalCost?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface FeedSale {
  id: string;
  date: string;
  customerName: string;
  feedProductId: string;
  feedProduct?: FeedProduct;
  qty: number;
  unitPrice: number;
  totalValue: number;
  createdAt: string;
  updatedAt?: string;
}

export interface FeedStockOpname {
  id: string;
  date: string;
  feedProductId: string;
  feedProduct?: FeedProduct;
  qtyKg: number;
  createdAt: string;
  updatedAt?: string;
}

export interface FeedStockDay {
  date: string;
  beliKg: number;
  pakaiKg: number;
  jualKg: number;
  sisaStokKg: number;
  sisaStokRealKg: number | null;
}

export interface SoTelurDay {
  date: string;
  telurBagusKg: number;
  telurRetakKg: number;
  telurBuleKg: number;
  totalProduksiKg: number;
  telurBagusRealKg: number | null;
  telurRetakRealKg: number | null;
  telurBuleRealKg: number | null;
  totalRealKg: number | null;
}

export interface MedicineVaccine {
  id: string;
  date: string;
  productName: string;
  category: MedCategory;
  qty: number;
  unit: string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface VaccinationSchedule {
  id: string;
  vaccineName: string;
  scheduleDate: string;
  notes?: string | null;
  isDone: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Mortality {
  id: string;
  date: string;
  house: string;
  count: number;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface FinancialNote {
  id: string;
  date: string;
  type: FinType;
  amount: number;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DailyMetric {
  id: string;
  date: string;
  house: string;
  fcr: number | null;
  hd: number | null;
  feedIntake: number | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  companyName?: string | null;
  notes?: string | null;
  logoUrl?: string | null;
  password?: string;
  createdAt: string;
}

export interface DashboardStats {
  eggStock: number;
  todayProduction: number;
  todaySales: number;
  todayMortality: number;
  monthlyProduction: number;
  monthlySales: number;
  monthlyMortality: number;
  todayCrackedEggs: { butir: number; kgTotal: number };
  upcomingVaccinations: VaccinationSchedule[];
  productionTrend: { date: string; value: number }[];
  salesTrend: { date: string; value: number }[];
  mortalityTrend: { date: string; value: number }[];
  dailyMetrics: DailyMetric[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}
