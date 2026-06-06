export type UserRole = "OWNER" | "STAFF";
export type MedCategory = "MEDICINE" | "VACCINE";
export type NotificationType =
  | "LOW_EGG_STOCK"
  | "LOW_FEED_STOCK"
  | "VACCINATION_DUE"
  | "GENERAL";

export interface EggProduction {
  id: string;
  date: string;
  house: string;
  goodEggs: number;
  crackedEggs: number;
  rejectedEggs: number;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface EggSale {
  id: string;
  date: string;
  customerName: string;
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
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
  upcomingVaccinations: VaccinationSchedule[];
  productionTrend: { date: string; value: number }[];
  salesTrend: { date: string; value: number }[];
  mortalityTrend: { date: string; value: number }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}
