import { getTotalEggsSold } from "./sales.service";
import { decimalToNumber } from "@/lib/utils";
import prisma from "@/lib/prisma";

export async function getEggStockKg(): Promise<number> {
  const [producedResult, sold] = await Promise.all([
    prisma.eggProduction.aggregate({ _sum: { goodEggsKg: true } }),
    getTotalEggsSold(),
  ]);
  const producedKg = decimalToNumber(producedResult._sum.goodEggsKg);
  return Math.max(0, producedKg - sold);
}

export async function getEggStock(): Promise<number> {
  return getEggStockKg();
}

export interface FeedStockItem {
  productId: string;
  productName: string;
  unit: string;
  purchased: number;
  used: number;
  sold: number;
  stock: number;
}

export async function getFeedStock(): Promise<FeedStockItem[]> {
  const products = await prisma.feedProduct.findMany({
    include: {
      purchases: { select: { qty: true } },
      usages: { select: { qtyUsed: true } },
      sales: { select: { qty: true } },
    },
  });

  return products.map((p) => {
    const purchased = p.purchases.reduce(
      (sum, r) => sum + decimalToNumber(r.qty),
      0
    );
    const used = p.usages.reduce(
      (sum, r) => sum + decimalToNumber(r.qtyUsed),
      0
    );
    const sold = p.sales.reduce((sum, r) => sum + decimalToNumber(r.qty), 0);
    return {
      productId: p.id,
      productName: p.name,
      unit: p.unit,
      purchased,
      used,
      sold,
      stock: Math.max(0, purchased - used - sold),
    };
  });
}

export async function getFeedStockByProduct(
  productId: string
): Promise<number> {
  const [purchases, usages, sales] = await Promise.all([
    prisma.feedPurchase.aggregate({
      where: { feedProductId: productId },
      _sum: { qty: true },
    }),
    prisma.feedUsage.aggregate({
      where: { feedProductId: productId },
      _sum: { qtyUsed: true },
    }),
    prisma.feedSale.aggregate({
      where: { feedProductId: productId },
      _sum: { qty: true },
    }),
  ]);

  const purchased = decimalToNumber(purchases._sum.qty);
  const used = decimalToNumber(usages._sum.qtyUsed);
  const sold = decimalToNumber(sales._sum.qty);

  return Math.max(0, purchased - used - sold);
}
