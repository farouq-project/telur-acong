import { getTotalEggsSold } from "./sales.service";
import { decimalToNumber } from "@/lib/utils";
import prisma from "@/lib/prisma";

export async function getEggStock(): Promise<number> {
  const [producedResult, sold] = await Promise.all([
    prisma.eggProduction.aggregate({ _sum: { goodEggsKg: true } }),
    getTotalEggsSold(),
  ]);
  const producedKg = decimalToNumber(producedResult._sum.goodEggsKg);
  return Math.max(0, producedKg - sold);
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
  const [products, purchases, usages, sales] = await Promise.all([
    prisma.feedProduct.findMany(),
    prisma.feedPurchase.groupBy({ by: ["feedProductId"], _sum: { qty: true } }),
    prisma.feedUsage.groupBy({ by: ["feedProductId"], _sum: { qtyUsed: true } }),
    prisma.feedSale.groupBy({ by: ["feedProductId"], _sum: { qty: true } }),
  ]);

  const purchasedByProduct = new Map(purchases.map((p) => [p.feedProductId, decimalToNumber(p._sum.qty)]));
  const usedByProduct = new Map(usages.map((u) => [u.feedProductId, decimalToNumber(u._sum.qtyUsed)]));
  const soldByProduct = new Map(sales.map((s) => [s.feedProductId, decimalToNumber(s._sum.qty)]));

  return products.map((p) => {
    const purchased = purchasedByProduct.get(p.id) ?? 0;
    const used = usedByProduct.get(p.id) ?? 0;
    const sold = soldByProduct.get(p.id) ?? 0;
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
