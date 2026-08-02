import prisma from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";
import { computeFifoFeedCost } from "@/services/feed.service";

export interface CreateProductionInput {
  date: string;
  house: string;
  populasi?: number;
  goodEggs: number;
  crackedEggs: number;
  rejectedEggs: number;
  goodEggsKg?: number;
  crackedEggsKg?: number;
  rejectedEggsKg?: number;
  feedQtyKg?: number;
  feedPricePerKg?: number;
  feedProductId?: string;
  mortality?: number;
  afkir?: number;
  umurAyam?: number;
  notes?: string;
}

function serializeRecord(r: {
  id: string;
  date: Date;
  house: string;
  populasi: number | null;
  goodEggs: number;
  crackedEggs: number;
  rejectedEggs: number;
  goodEggsKg: unknown;
  crackedEggsKg: unknown;
  rejectedEggsKg: unknown;
  feedQtyKg: unknown;
  feedPricePerKg: unknown;
  feedProductId: string | null;
  mortality: number | null;
  afkir: number | null;
  umurAyam: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...r,
    date: r.date.toISOString(),
    goodEggsKg: r.goodEggsKg != null ? decimalToNumber(r.goodEggsKg) : null,
    crackedEggsKg: r.crackedEggsKg != null ? decimalToNumber(r.crackedEggsKg) : null,
    rejectedEggsKg: r.rejectedEggsKg != null ? decimalToNumber(r.rejectedEggsKg) : null,
    feedQtyKg: r.feedQtyKg != null ? decimalToNumber(r.feedQtyKg) : null,
    feedPricePerKg: r.feedPricePerKg != null ? decimalToNumber(r.feedPricePerKg) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function getProductions(params?: {
  search?: string;
  houses?: string[];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const { search, houses, from, to, limit = 50, offset = 0 } = params ?? {};

  const where: Record<string, unknown> = {};

  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  if (houses && houses.length > 0) {
    where.house = { in: houses };
  } else if (search) {
    where.house = { contains: search };
  }

  const [records, total] = await Promise.all([
    prisma.eggProduction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.eggProduction.count({ where }),
  ]);

  return {
    data: records.map(serializeRecord),
    total,
  };
}

export async function getProductionById(id: string) {
  const record = await prisma.eggProduction.findUnique({ where: { id } });
  if (!record) return null;
  return serializeRecord(record);
}

// Sinkronkan catatan FeedUsage yang terhubung ke produksi: dibuat/diperbarui/dihapus
// otomatis mengikuti Jenis Pakan + Pakan (kg) pada form Produksi, agar Stok Pakan
// (yang menjumlahkan FeedProduct.usages) selalu mencerminkan konsumsi dari Produksi.
async function syncProductionFeedUsage(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  production: { id: string; date: Date; house: string },
  feedProductId?: string | null,
  feedQtyKg?: number | null
) {
  const shouldHaveUsage = !!feedProductId && feedQtyKg != null && feedQtyKg > 0;

  if (shouldHaveUsage) {
    const existing = await tx.feedUsage.findUnique({ where: { productionId: production.id } });
    const { unitCost, totalCost } = await computeFifoFeedCost(tx, {
      feedProductId: feedProductId!,
      date: production.date,
      qtyUsed: feedQtyKg!,
      createdAt: existing?.createdAt,
      excludeUsageId: existing?.id,
    });

    await tx.feedUsage.upsert({
      where: { productionId: production.id },
      create: {
        date: production.date,
        house: production.house,
        feedProductId: feedProductId!,
        qtyUsed: feedQtyKg!,
        unitCost,
        totalCost,
        notes: "Otomatis dari catatan Produksi",
        productionId: production.id,
      },
      update: {
        date: production.date,
        house: production.house,
        feedProductId: feedProductId!,
        qtyUsed: feedQtyKg!,
        unitCost,
        totalCost,
      },
    });
  } else {
    await tx.feedUsage.deleteMany({ where: { productionId: production.id } });
  }
}

export async function createProduction(input: CreateProductionInput) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.eggProduction.create({
      data: {
        date: new Date(input.date),
        house: input.house,
        populasi: input.populasi ?? null,
        goodEggs: input.goodEggs,
        crackedEggs: input.crackedEggs,
        rejectedEggs: input.rejectedEggs,
        goodEggsKg: input.goodEggsKg ?? null,
        crackedEggsKg: input.crackedEggsKg ?? null,
        rejectedEggsKg: input.rejectedEggsKg ?? null,
        feedQtyKg: input.feedQtyKg ?? null,
        feedPricePerKg: input.feedPricePerKg ?? null,
        feedProductId: input.feedProductId ?? null,
        mortality: input.mortality ?? null,
        afkir: input.afkir ?? null,
        notes: input.notes,
      },
    });

    await syncProductionFeedUsage(tx, record, input.feedProductId, input.feedQtyKg);

    return serializeRecord(record);
  });
}

function buildProductionData(input: CreateProductionInput) {
  return {
    date: new Date(input.date),
    house: input.house,
    populasi: input.populasi ?? null,
    goodEggs: input.goodEggs,
    crackedEggs: input.crackedEggs,
    rejectedEggs: input.rejectedEggs,
    goodEggsKg: input.goodEggsKg ?? null,
    crackedEggsKg: input.crackedEggsKg ?? null,
    rejectedEggsKg: input.rejectedEggsKg ?? null,
    feedQtyKg: input.feedQtyKg ?? null,
    feedPricePerKg: input.feedPricePerKg ?? null,
    feedProductId: input.feedProductId ?? null,
    mortality: input.mortality ?? null,
    afkir: input.afkir ?? null,
    umurAyam: input.umurAyam ?? null,
    notes: input.notes ?? null,
  };
}

const BULK_CHUNK_SIZE = 200;

// Baris tanpa Jenis Pakan + Pakan (kg) tidak memerlukan sinkronisasi FeedUsage,
// jadi bisa dimasukkan sekaligus lewat createMany (jauh lebih cepat untuk impor besar
// terhadap database remote — menghindari timeout serverless function).
export async function bulkCreateProductions(inputs: CreateProductionInput[]) {
  let count = 0;

  for (let i = 0; i < inputs.length; i += BULK_CHUNK_SIZE) {
    const chunk = inputs.slice(i, i + BULK_CHUNK_SIZE);
    const plain: CreateProductionInput[] = [];
    const withFeed: CreateProductionInput[] = [];
    for (const input of chunk) {
      if (input.feedProductId && input.feedQtyKg != null && input.feedQtyKg > 0) withFeed.push(input);
      else plain.push(input);
    }

    if (plain.length > 0) {
      const result = await prisma.eggProduction.createMany({
        data: plain.map(buildProductionData),
      });
      count += result.count;
    }

    for (const input of withFeed) {
      await prisma.$transaction(async (tx) => {
        const record = await tx.eggProduction.create({ data: buildProductionData(input) });
        await syncProductionFeedUsage(tx, record, input.feedProductId, input.feedQtyKg);
      });
      count += 1;
    }
  }

  return count;
}

export async function updateProduction(
  id: string,
  input: Partial<CreateProductionInput>
) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.eggProduction.update({
      where: { id },
      data: {
        ...(input.date && { date: new Date(input.date) }),
        ...(input.house !== undefined && { house: input.house }),
        ...(input.populasi !== undefined && { populasi: input.populasi }),
        ...(input.goodEggs !== undefined && { goodEggs: input.goodEggs }),
        ...(input.crackedEggs !== undefined && { crackedEggs: input.crackedEggs }),
        ...(input.rejectedEggs !== undefined && { rejectedEggs: input.rejectedEggs }),
        ...(input.goodEggsKg !== undefined && { goodEggsKg: input.goodEggsKg }),
        ...(input.crackedEggsKg !== undefined && { crackedEggsKg: input.crackedEggsKg }),
        ...(input.rejectedEggsKg !== undefined && { rejectedEggsKg: input.rejectedEggsKg }),
        ...(input.feedQtyKg !== undefined && { feedQtyKg: input.feedQtyKg }),
        ...(input.feedPricePerKg !== undefined && { feedPricePerKg: input.feedPricePerKg }),
        ...(input.feedProductId !== undefined && { feedProductId: input.feedProductId }),
        ...(input.mortality !== undefined && { mortality: input.mortality }),
        ...(input.afkir !== undefined && { afkir: input.afkir }),
        ...(input.umurAyam !== undefined && { umurAyam: input.umurAyam }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });

    if (input.feedProductId !== undefined || input.feedQtyKg !== undefined) {
      const feedProductId = input.feedProductId !== undefined ? input.feedProductId : record.feedProductId;
      const feedQtyKg = input.feedQtyKg !== undefined ? input.feedQtyKg : decimalToNumber(record.feedQtyKg);
      await syncProductionFeedUsage(tx, record, feedProductId, feedQtyKg);
    }

    return serializeRecord(record);
  });
}

export async function deleteProduction(id: string) {
  // FeedUsage terhubung dihapus otomatis lewat onDelete: Cascade pada relasi productionId
  await prisma.eggProduction.delete({ where: { id } });
}

export async function deleteProductions(ids: string[]) {
  // FeedUsage terhubung dihapus otomatis lewat onDelete: Cascade pada relasi productionId
  const result = await prisma.eggProduction.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}

export async function getTodayCrackedEggs(): Promise<{ butir: number; kgTotal: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const result = await prisma.eggProduction.aggregate({
    where: { date: { gte: today, lt: tomorrow } },
    _sum: { crackedEggs: true, crackedEggsKg: true },
  });
  return {
    butir: result._sum.crackedEggs ?? 0,
    kgTotal: result._sum.crackedEggsKg != null ? decimalToNumber(result._sum.crackedEggsKg) : 0,
  };
}

export async function getTodayProduction(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const result = await prisma.eggProduction.aggregate({
    where: { date: { gte: today, lt: tomorrow } },
    _sum: { goodEggs: true },
  });
  return result._sum.goodEggs ?? 0;
}

export async function getTotalGoodEggs(): Promise<number> {
  const result = await prisma.eggProduction.aggregate({
    _sum: { goodEggs: true },
  });
  return result._sum.goodEggs ?? 0;
}

export async function getMonthlyProduction(): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const result = await prisma.eggProduction.aggregate({
    where: { date: { gte: start, lte: end } },
    _sum: { goodEggs: true },
  });
  return result._sum.goodEggs ?? 0;
}

export async function getProductionTrend(days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const records = await prisma.eggProduction.findMany({
    where: { date: { gte: from } },
    select: { date: true, goodEggs: true },
    orderBy: { date: "asc" },
  });

  const grouped: Record<string, number> = {};
  records.forEach((r) => {
    const key = r.date.toISOString().split("T")[0];
    grouped[key] = (grouped[key] ?? 0) + r.goodEggs;
  });

  return Object.entries(grouped).map(([date, value]) => ({ date, value }));
}

export async function getProductionTrendByHouse(days = 90) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const records = await prisma.eggProduction.findMany({
    where: { date: { gte: from } },
    select: { date: true, house: true, goodEggs: true },
    orderBy: { date: "asc" },
  });

  const grouped: Record<string, { date: string; house: string; value: number }> = {};
  records.forEach((r) => {
    const dateKey = r.date.toISOString().split("T")[0];
    const key = `${dateKey}__${r.house}`;
    if (!grouped[key]) grouped[key] = { date: dateKey, house: r.house, value: 0 };
    grouped[key].value += r.goodEggs;
  });

  return Object.values(grouped);
}

export interface HouseReport {
  house: string;
  populasi: number | null;
  mati: number;
  pakanKg: number;
  butirBagus: number;
  butirRetak: number;
  telurBagusKg: number;
  telurRetakKg: number;
  umurAyam: number | null;
  fcr: number | null;
  hd: number | null;
  feedIntake: number | null;
}

// Ringkasan per kandang untuk dashboard: Populasi diambil dari catatan terakhir
// (urut tanggal), sedangkan Mati/Pakan/Telur Bagus/Telur Retak adalah total kumulatif.
export async function getProductionReportByHouse(params?: { from?: string; to?: string }): Promise<HouseReport[]> {
  const { from, to } = params ?? {};
  const records = await prisma.eggProduction.findMany({
    where: {
      ...(from || to
        ? {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    },
    select: {
      house: true,
      date: true,
      populasi: true,
      mortality: true,
      goodEggs: true,
      crackedEggs: true,
      feedQtyKg: true,
      goodEggsKg: true,
      crackedEggsKg: true,
      umurAyam: true,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const map = new Map<string, HouseReport>();
  for (const r of records) {
    let entry = map.get(r.house);
    if (!entry) {
      entry = { house: r.house, populasi: null, mati: 0, butirBagus: 0, butirRetak: 0, pakanKg: 0, telurBagusKg: 0, telurRetakKg: 0, umurAyam: null, fcr: null, hd: null, feedIntake: null };
      map.set(r.house, entry);
    }
    entry.mati += r.mortality ?? 0;
    entry.butirBagus += r.goodEggs;
    entry.butirRetak += r.crackedEggs;
    entry.pakanKg += decimalToNumber(r.feedQtyKg);
    entry.telurBagusKg += decimalToNumber(r.goodEggsKg);
    entry.telurRetakKg += decimalToNumber(r.crackedEggsKg);
    if (r.populasi != null) entry.populasi = r.populasi;
    if (r.umurAyam != null) entry.umurAyam = r.umurAyam;
  }

  // For houses with no umurAyam in the filtered range, extrapolate from the nearest global anchor
  const housesNeedingUmur = Array.from(map.keys()).filter((h) => map.get(h)!.umurAyam == null);
  if (housesNeedingUmur.length > 0) {
    const refDate = to ? new Date(to) : new Date();
    const anchors = await Promise.all(
      housesNeedingUmur.map((house) =>
        prisma.eggProduction.findFirst({
          where: { house, umurAyam: { not: null } },
          orderBy: { date: "desc" },
          select: { house: true, date: true, umurAyam: true },
        })
      )
    );
    for (const anchor of anchors) {
      if (!anchor) continue;
      const entry = map.get(anchor.house);
      if (!entry) continue;
      const daysDiff = Math.round((refDate.getTime() - anchor.date.getTime()) / 86400000);
      entry.umurAyam = Math.max(0, anchor.umurAyam! + Math.floor(daysDiff / 7));
    }
  }

  return Array.from(map.values()).sort((a, b) => a.house.localeCompare(b.house));
}

export async function getAfkirLogByHouse(): Promise<Record<string, { date: string; afkir: number }[]>> {
  const records = await prisma.eggProduction.findMany({
    where: { afkir: { gt: 0 } },
    select: { house: true, date: true, afkir: true },
    orderBy: { date: "desc" },
  });
  const result: Record<string, { date: string; afkir: number }[]> = {};
  for (const r of records) {
    if (!result[r.house]) result[r.house] = [];
    result[r.house].push({ date: r.date.toISOString(), afkir: r.afkir! });
  }
  return result;
}

export interface EggFlowDay {
  date: string;
  stokKemarin: number;
  produksiHariIni: number;
  terjualHariIni: number;
  stokHariIni: number;
}

// Alur stok telur per hari: stok kemarin + produksi hari ini − terjual hari ini = stok hari ini.
// Jika tidak ada rentang tanggal, default ke 7 hari terakhir.
export async function getEggFlowByDay(params?: { from?: string; to?: string }): Promise<EggFlowDay[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const from = params?.from ? new Date(params.from) : new Date(today);
  const to = params?.to ? new Date(params.to) : new Date(today);
  if (!params?.from && !params?.to) {
    from.setDate(from.getDate() - 6);
  }
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  const [priorProduced, priorSold, rangeProduction, rangeSales] = await Promise.all([
    prisma.eggProduction.aggregate({
      where: { date: { lt: from } },
      _sum: { goodEggsKg: true, crackedEggsKg: true, rejectedEggsKg: true },
    }),
    prisma.eggSale.aggregate({
      where: { date: { lt: from } },
      _sum: { qtySold: true },
    }),
    prisma.eggProduction.findMany({
      where: { date: { gte: from, lte: to } },
      select: { date: true, goodEggsKg: true, crackedEggsKg: true, rejectedEggsKg: true },
    }),
    prisma.eggSale.findMany({
      where: { date: { gte: from, lte: to } },
      select: { date: true, qtySold: true },
    }),
  ]);

  const producedByDay = new Map<string, number>();
  for (const r of rangeProduction) {
    const key = r.date.toISOString().slice(0, 10);
    const kg = decimalToNumber(r.goodEggsKg) + decimalToNumber(r.crackedEggsKg) + decimalToNumber(r.rejectedEggsKg);
    producedByDay.set(key, (producedByDay.get(key) ?? 0) + kg);
  }

  const soldByDay = new Map<string, number>();
  for (const r of rangeSales) {
    const key = r.date.toISOString().slice(0, 10);
    soldByDay.set(key, (soldByDay.get(key) ?? 0) + decimalToNumber(r.qtySold));
  }

  let runningStock = Math.max(
    0,
    decimalToNumber(priorProduced._sum.goodEggsKg) +
      decimalToNumber(priorProduced._sum.crackedEggsKg) +
      decimalToNumber(priorProduced._sum.rejectedEggsKg) -
      decimalToNumber(priorSold._sum.qtySold)
  );

  const result: EggFlowDay[] = [];
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const produksi = producedByDay.get(key) ?? 0;
    const terjual = soldByDay.get(key) ?? 0;
    const stokKemarin = runningStock;
    const stokHariIni = Math.max(0, stokKemarin + produksi - terjual);
    result.push({ date: key, stokKemarin, produksiHariIni: produksi, terjualHariIni: terjual, stokHariIni });
    runningStock = stokHariIni;
  }

  return result;
}

export interface DailyMetric {
  id: string;
  date: string;
  house: string;
  fcr: number | null;
  hd: number | null;
  feedIntake: number | null;
}

// Metrik dihitung per hari per kandang langsung dari satu record produksi:
// - FCR = Pakan (kg) / Total Produksi Telur (kg) [Bagus + Retak] — rasio desimal
// - HD  = Total Butir [Bagus + Retak] / Sisa Populasi [Populasi - Kematian] — persentase
// - FI  = Pakan (kg) / Sisa Populasi [Populasi - Kematian] — rasio desimal
export async function getDailyMetrics(params?: { from?: string; to?: string }) {
  let dateFilter: Record<string, Date>;
  if (params?.from || params?.to) {
    dateFilter = {
      ...(params.from && { gte: new Date(params.from) }),
      ...(params.to && { lte: new Date(params.to) }),
    };
  } else {
    const from = new Date();
    from.setDate(from.getDate() - 180);
    from.setHours(0, 0, 0, 0);
    dateFilter = { gte: from };
  }

  const records = await prisma.eggProduction.findMany({
    where: { date: dateFilter },
    select: {
      id: true,
      date: true,
      house: true,
      populasi: true,
      mortality: true,
      goodEggs: true,
      crackedEggs: true,
      goodEggsKg: true,
      crackedEggsKg: true,
      feedQtyKg: true,
    },
    orderBy: [{ date: "desc" }, { house: "asc" }],
  });

  return records.map((r): DailyMetric => {
    const feedQtyKg = decimalToNumber(r.feedQtyKg);
    const totalEggsKg = decimalToNumber(r.goodEggsKg) + decimalToNumber(r.crackedEggsKg);
    const totalEggs = r.goodEggs + r.crackedEggs;
    const sisaPopulasi = r.populasi != null ? r.populasi - (r.mortality ?? 0) : null;

    const fcr = totalEggsKg > 0 && feedQtyKg > 0 ? feedQtyKg / totalEggsKg : null;
    const hd = sisaPopulasi != null && sisaPopulasi > 0 ? (totalEggs / sisaPopulasi) * 100 : null;
    const feedIntake = sisaPopulasi != null && sisaPopulasi > 0 && feedQtyKg > 0 ? feedQtyKg / sisaPopulasi : null;

    return {
      id: r.id,
      date: r.date.toISOString(),
      house: r.house,
      fcr: fcr !== null ? Math.round(fcr * 100000) / 100000 : null,
      hd: hd !== null ? Math.round(hd * 100) / 100 : null,
      feedIntake: feedIntake !== null ? Math.round(feedIntake * 1000) / 1000 : null,
    };
  });
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

// Tabel SO Telur harian: produksi (bagus/retak/bule) vs hasil stok opname real per hari.
// Jika tidak ada rentang tanggal, default ke 30 hari terakhir.
export async function getSoTelurDaily(params?: { from?: string; to?: string }): Promise<SoTelurDay[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const from = params?.from ? new Date(params.from) : new Date(today);
  const to = params?.to ? new Date(params.to) : new Date(today);
  if (!params?.from && !params?.to) {
    from.setDate(from.getDate() - 29);
  }
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  const [rangeProduction, rangeOpnames] = await Promise.all([
    prisma.eggProduction.findMany({
      where: { date: { gte: from, lte: to } },
      select: { date: true, goodEggsKg: true, crackedEggsKg: true, rejectedEggsKg: true },
    }),
    prisma.eggStockOpname.findMany({
      where: { date: { gte: from, lte: to } },
    }),
  ]);

  const productionByDay = new Map<string, { bagus: number; retak: number; bule: number }>();
  for (const r of rangeProduction) {
    const key = r.date.toISOString().slice(0, 10);
    const cur = productionByDay.get(key) ?? { bagus: 0, retak: 0, bule: 0 };
    cur.bagus += decimalToNumber(r.goodEggsKg);
    cur.retak += decimalToNumber(r.crackedEggsKg);
    cur.bule += decimalToNumber(r.rejectedEggsKg);
    productionByDay.set(key, cur);
  }

  const opnameByDay = new Map<string, { bagus: number; retak: number; bule: number }>();
  for (const r of rangeOpnames) {
    const key = r.date.toISOString().slice(0, 10);
    opnameByDay.set(key, {
      bagus: decimalToNumber(r.telurBagusKg),
      retak: decimalToNumber(r.telurRetakKg),
      bule: decimalToNumber(r.telurBuleKg),
    });
  }

  const result: SoTelurDay[] = [];
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const prod = productionByDay.get(key) ?? { bagus: 0, retak: 0, bule: 0 };
    const opname = opnameByDay.get(key);
    result.push({
      date: key,
      telurBagusKg: prod.bagus,
      telurRetakKg: prod.retak,
      telurBuleKg: prod.bule,
      totalProduksiKg: prod.bagus + prod.retak + prod.bule,
      telurBagusRealKg: opname ? opname.bagus : null,
      telurRetakRealKg: opname ? opname.retak : null,
      telurBuleRealKg: opname ? opname.bule : null,
      totalRealKg: opname ? opname.bagus + opname.retak + opname.bule : null,
    });
  }

  return result;
}

export async function upsertEggStockOpname(input: { date: string; telurBagusKg: number; telurRetakKg: number; telurBuleKg: number }) {
  const date = new Date(input.date);
  const record = await prisma.eggStockOpname.upsert({
    where: { date },
    create: {
      date,
      telurBagusKg: input.telurBagusKg,
      telurRetakKg: input.telurRetakKg,
      telurBuleKg: input.telurBuleKg,
    },
    update: {
      telurBagusKg: input.telurBagusKg,
      telurRetakKg: input.telurRetakKg,
      telurBuleKg: input.telurBuleKg,
    },
  });
  return {
    ...record,
    date: record.date.toISOString(),
    telurBagusKg: decimalToNumber(record.telurBagusKg),
    telurRetakKg: decimalToNumber(record.telurRetakKg),
    telurBuleKg: decimalToNumber(record.telurBuleKg),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
