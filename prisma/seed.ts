import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 1): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database dengan data simulasi...\n");

  // ── Users ──────────────────────────────────────────────────────────────────

  const ownerPassword = await bcrypt.hash("Admin1234", 10);
  const staffPassword = await bcrypt.hash("Staff1234", 10);

  const owner = await prisma.user.upsert({
    where: { email: "owner@farm.com" },
    update: {},
    create: { name: "Budi Santoso", email: "owner@farm.com", password: ownerPassword, role: "OWNER", isActive: true },
  });

  await prisma.user.upsert({
    where: { email: "staf@farm.com" },
    update: {},
    create: { name: "Agus Prasetyo", email: "staf@farm.com", password: staffPassword, role: "STAFF", isActive: true },
  });

  await prisma.user.upsert({
    where: { email: "staf2@farm.com" },
    update: {},
    create: { name: "Siti Rahayu", email: "staf2@farm.com", password: staffPassword, role: "STAFF", isActive: true },
  });

  console.log("✅ Users (3 akun)");

  // ── Feed Products ──────────────────────────────────────────────────────────

  const pakanA = await prisma.feedProduct.upsert({
    where: { id: "feed-product-1" },
    update: {},
    create: { id: "feed-product-1", name: "Pakan Layer Starter", unit: "kg" },
  });

  const pakanB = await prisma.feedProduct.upsert({
    where: { id: "feed-product-2" },
    update: {},
    create: { id: "feed-product-2", name: "Pakan Layer Grower", unit: "kg" },
  });

  const pakanC = await prisma.feedProduct.upsert({
    where: { id: "feed-product-3" },
    update: {},
    create: { id: "feed-product-3", name: "Konsentrat Protein", unit: "kg" },
  });

  console.log("✅ Feed Products (3 produk)");

  // ── Egg Production — 60 hari terakhir ─────────────────────────────────────

  const houses = ["Kandang A", "Kandang B", "Kandang C"];
  const productionRecords = [];

  for (let day = 59; day >= 0; day--) {
    const date = daysAgo(day);
    // Skip ~5% of days (weekend low production)
    const isLowDay = day % 7 === 0;

    for (const house of houses) {
      const baseGood = isLowDay ? rand(180, 250) : rand(280, 380);
      productionRecords.push({
        date,
        house,
        goodEggs: baseGood,
        crackedEggs: rand(2, 12),
        rejectedEggs: rand(0, 5),
        notes: day === 0 ? "Produksi hari ini" : undefined,
      });
    }
  }

  await prisma.eggProduction.deleteMany({});
  await prisma.eggProduction.createMany({ data: productionRecords });
  console.log(`✅ Egg Production (${productionRecords.length} catatan, 60 hari)`);

  // ── Egg Sales — 60 hari terakhir ──────────────────────────────────────────

  const customers = [
    "Toko Pak Haji",
    "Warung Bu Sari",
    "Rumah Makan Padang Jaya",
    "Supermarket Maju",
    "Pedagang Pasar Baru",
    "Catering Ibu Rini",
    "Toko Sembako Makmur",
    "RM Sate Pak Dadang",
  ];

  const salesData = [];

  for (let day = 59; day >= 1; day -= rand(1, 3)) {
    const date = daysAgo(day);
    const customer = customers[rand(0, customers.length - 1)];
    const qty = rand(200, 800);
    const unitPrice = rand(1600, 2000);
    salesData.push({
      date,
      customerName: customer,
      qtySold: qty,
      unitPrice,
      totalValue: qty * unitPrice,
      notes: rand(0, 3) === 0 ? "Pelanggan tetap" : undefined,
    });
  }

  // Pastikan ada penjualan hari ini
  salesData.push({
    date: daysAgo(0),
    customerName: "Toko Pak Haji",
    qtySold: rand(150, 300),
    unitPrice: 1800,
    totalValue: 0,
    notes: "Pengiriman pagi",
  });
  salesData[salesData.length - 1].totalValue =
    salesData[salesData.length - 1].qtySold * salesData[salesData.length - 1].unitPrice;

  await prisma.eggSale.deleteMany({});
  await prisma.eggSale.createMany({ data: salesData });
  console.log(`✅ Egg Sales (${salesData.length} transaksi, 60 hari)`);

  // ── Feed Purchases ─────────────────────────────────────────────────────────

  const feedProducts = [pakanA, pakanB, pakanC];
  const feedPurchaseData = [];

  for (let week = 0; week < 8; week++) {
    const day = week * 7 + rand(0, 2);
    const date = daysAgo(day);
    for (const product of feedProducts) {
      if (rand(0, 2) > 0) {
        feedPurchaseData.push({
          date,
          feedProductId: product.id,
          qty: randFloat(500, 2000),
          notes: `Pembelian minggu ke-${8 - week}`,
        });
      }
    }
  }

  // Pembelian terbaru (kemarin)
  feedPurchaseData.push({
    date: daysAgo(1),
    feedProductId: pakanA.id,
    qty: 1500,
    notes: "Stok mingguan",
  });

  await prisma.feedPurchase.deleteMany({});
  await prisma.feedPurchase.createMany({ data: feedPurchaseData });
  console.log(`✅ Feed Purchases (${feedPurchaseData.length} pembelian)`);

  // ── Feed Usage — setiap hari 60 hari terakhir ─────────────────────────────

  const feedUsageData = [];

  for (let day = 59; day >= 0; day--) {
    const date = daysAgo(day);
    for (const house of houses) {
      const product = rand(0, 1) === 0 ? pakanA : pakanB;
      feedUsageData.push({
        date,
        house,
        feedProductId: product.id,
        qtyUsed: randFloat(40, 80),
        notes: undefined,
      });
    }
    // Tambah konsentrat 3x seminggu
    if (day % 2 === 0) {
      feedUsageData.push({
        date,
        house: "Kandang A",
        feedProductId: pakanC.id,
        qtyUsed: randFloat(10, 20),
        notes: "Suplemen protein",
      });
    }
  }

  await prisma.feedUsage.deleteMany({});
  await prisma.feedUsage.createMany({ data: feedUsageData });
  console.log(`✅ Feed Usage (${feedUsageData.length} catatan)`);

  // ── Feed Sales ─────────────────────────────────────────────────────────────

  const feedSalesData = [];

  for (let week = 0; week < 4; week++) {
    const day = week * 14 + rand(0, 3);
    const date = daysAgo(day);
    const product = rand(0, 1) === 0 ? pakanA : pakanB;
    const qty = randFloat(100, 300);
    const unitPrice = rand(8500, 10000);
    feedSalesData.push({
      date,
      customerName: `Peternak ${["Pak Joko", "Bu Dewi", "Pak Rahman", "Mbak Lia"][week % 4]}`,
      feedProductId: product.id,
      qty,
      unitPrice,
      totalValue: qty * unitPrice,
    });
  }

  await prisma.feedSale.deleteMany({});
  await prisma.feedSale.createMany({ data: feedSalesData });
  console.log(`✅ Feed Sales (${feedSalesData.length} penjualan)`);

  // ── Medicine & Vaccine ─────────────────────────────────────────────────────

  const medicineData = [
    {
      date: daysAgo(55),
      productName: "Antibiotik Enrofloxacin",
      category: "MEDICINE" as const,
      qty: 10,
      unit: "botol",
      notes: "Pengobatan infeksi pernapasan Kandang B",
    },
    {
      date: daysAgo(45),
      productName: "Vaksin ND Lasota",
      category: "VACCINE" as const,
      qty: 5,
      unit: "ampul",
      notes: "Vaksinasi rutin Newcastle Disease",
    },
    {
      date: daysAgo(40),
      productName: "Vitamin Elektrolit",
      category: "MEDICINE" as const,
      qty: 3,
      unit: "sachet",
      notes: "Suplemen pasca vaksin",
    },
    {
      date: daysAgo(30),
      productName: "Desinfektan Kandang",
      category: "MEDICINE" as const,
      qty: 4,
      unit: "liter",
      notes: "Sanitasi kandang bulanan",
    },
    {
      date: daysAgo(25),
      productName: "Vaksin IB (Infectious Bronchitis)",
      category: "VACCINE" as const,
      qty: 5,
      unit: "ampul",
      notes: "Booster IB",
    },
    {
      date: daysAgo(18),
      productName: "Obat Cacing Levamisole",
      category: "MEDICINE" as const,
      qty: 2,
      unit: "botol",
      notes: "Deworm rutin 6 bulanan",
    },
    {
      date: daysAgo(10),
      productName: "Multivitamin Plus",
      category: "MEDICINE" as const,
      qty: 6,
      unit: "sachet",
      notes: "Stres akibat cuaca panas",
    },
    {
      date: daysAgo(5),
      productName: "Vaksin AI H5N1",
      category: "VACCINE" as const,
      qty: 3,
      unit: "ampul",
      notes: "Vaksin flu burung tahunan",
    },
    {
      date: daysAgo(2),
      productName: "Antibiotik Tylosin",
      category: "MEDICINE" as const,
      qty: 5,
      unit: "botol",
      notes: "Pengobatan CRD Kandang A",
    },
  ];

  await prisma.medicineVaccine.deleteMany({});
  await prisma.medicineVaccine.createMany({ data: medicineData });
  console.log(`✅ Medicine & Vaccine (${medicineData.length} catatan)`);

  // ── Vaccination Schedules ──────────────────────────────────────────────────

  const vaccinationData = [
    {
      id: "vacc-1",
      vaccineName: "Newcastle Disease (ND) Booster",
      scheduleDate: daysAgo(-4), // 4 hari ke depan
      notes: "Vaksin rutin ND setiap 2 bulan",
      isDone: false,
    },
    {
      id: "vacc-2",
      vaccineName: "Infectious Bronchitis (IB)",
      scheduleDate: daysAgo(-7), // 7 hari ke depan
      notes: "Booster IB — semprot mata/hidung",
      isDone: false,
    },
    {
      id: "vacc-3",
      vaccineName: "Avian Influenza H5N1",
      scheduleDate: daysAgo(-21), // 21 hari ke depan
      notes: "Vaksin tahunan wajib",
      isDone: false,
    },
    {
      id: "vacc-4",
      vaccineName: "Marek's Disease",
      scheduleDate: daysAgo(30), // 30 hari lalu — sudah selesai
      notes: "Vaksin DOC baru masuk",
      isDone: true,
    },
    {
      id: "vacc-5",
      vaccineName: "Gumboro (IBD)",
      scheduleDate: daysAgo(45),
      notes: "Vaksinasi Gumboro periode lalu",
      isDone: true,
    },
  ];

  await prisma.vaccinationSchedule.deleteMany({});
  for (const v of vaccinationData) {
    await prisma.vaccinationSchedule.upsert({
      where: { id: v.id },
      update: v,
      create: v,
    });
  }
  console.log(`✅ Vaccination Schedules (${vaccinationData.length} jadwal)`);

  // ── Mortality ─────────────────────────────────────────────────────────────

  const mortalityData = [];
  const mortalityCauses = [
    "Penyakit pernapasan",
    "Stres panas",
    "Tidak diketahui",
    "Luka akibat kandang",
    "CRD",
    undefined,
  ];

  for (let day = 58; day >= 0; day--) {
    const date = daysAgo(day);
    const hasEvent = rand(0, 3) > 1; // ~50% hari ada kematian
    if (!hasEvent) continue;

    const house = houses[rand(0, houses.length - 1)];
    const count = rand(1, 5);
    const cause = mortalityCauses[rand(0, mortalityCauses.length - 1)];

    mortalityData.push({ date, house, count, notes: cause });

    // Kadang ada kematian di 2 kandang sekaligus
    if (rand(0, 4) === 0) {
      const house2 = houses.find((h) => h !== house)!;
      mortalityData.push({ date, house: house2, count: rand(1, 3), notes: cause });
    }
  }

  // Pastikan ada kematian hari ini
  mortalityData.push({ date: daysAgo(0), house: "Kandang B", count: 2, notes: "Stres panas" });

  await prisma.mortality.deleteMany({});
  await prisma.mortality.createMany({ data: mortalityData });
  console.log(`✅ Mortality (${mortalityData.length} catatan)`);

  // ── Notifications ─────────────────────────────────────────────────────────

  await prisma.notification.deleteMany({});
  await prisma.notification.createMany({
    data: [
      {
        userId: owner.id,
        type: "VACCINATION_DUE",
        title: "Jadwal Vaksin Mendekat",
        message: "Vaksin Newcastle Disease (ND) Booster dijadwalkan 4 hari lagi.",
        isRead: false,
      },
      {
        userId: owner.id,
        type: "VACCINATION_DUE",
        title: "Jadwal Vaksin Mendekat",
        message: "Vaksin Infectious Bronchitis (IB) dijadwalkan 7 hari lagi.",
        isRead: false,
      },
      {
        userId: owner.id,
        type: "GENERAL",
        title: "Selamat Datang",
        message: "Sistem Telur Acong siap digunakan. Mulai catat produksi harian Anda.",
        isRead: true,
      },
    ],
  });
  console.log("✅ Notifications (3 notifikasi)");

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(50));
  console.log("✅ Seed selesai! Ringkasan data:");
  console.log("═".repeat(50));
  console.log(`   👤 Users           : 3 akun`);
  console.log(`   🥚 Egg Production  : ${productionRecords.length} catatan (60 hari)`);
  console.log(`   🛒 Egg Sales       : ${salesData.length} transaksi`);
  console.log(`   🌾 Feed Products   : 3 produk`);
  console.log(`   📦 Feed Purchases  : ${feedPurchaseData.length} pembelian`);
  console.log(`   🍽  Feed Usage      : ${feedUsageData.length} catatan`);
  console.log(`   💰 Feed Sales      : ${feedSalesData.length} transaksi`);
  console.log(`   💊 Medicine/Vaccine: ${medicineData.length} catatan`);
  console.log(`   📅 Vacc Schedules  : ${vaccinationData.length} jadwal`);
  console.log(`   ☠️  Mortality       : ${mortalityData.length} catatan`);
  console.log("═".repeat(50));
  console.log("\n📋 Akun login:");
  console.log(`   Owner  : owner@farm.com  / Admin1234`);
  console.log(`   Staff  : staf@farm.com   / Staff1234`);
  console.log(`   Staff2 : staf2@farm.com  / Staff1234`);
}

main()
  .catch((e) => {
    console.error("\n❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
