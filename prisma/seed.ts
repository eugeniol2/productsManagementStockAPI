import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type MovementType } from "@prisma/client";

const TODAY = new Date("2026-08-29T00:00:00Z");
const DAY_IN_MS = 86_400_000;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type CategorySeed = {
  name: string;
  requiresExpiry: boolean;
};

type ProductSeed = {
  name: string;
  category: string;
  unitsPerPack: number;
  salePrice: string;
  unitBarcode: boolean;
  packBarcode: boolean;
};

type MovementSeed = {
  type: MovementType;
  quantity: number;
  occurredAt: Date;
};

const categories: CategorySeed[] = [
  { name: "Mercearia", requiresExpiry: true },
  { name: "Bebidas", requiresExpiry: true },
  { name: "Laticínios e frios", requiresExpiry: true },
  { name: "Padaria", requiresExpiry: true },
  { name: "Hortifruti", requiresExpiry: true },
  { name: "Carnes e congelados", requiresExpiry: true },
  { name: "Doces e snacks", requiresExpiry: true },
  { name: "Limpeza", requiresExpiry: false },
  { name: "Higiene pessoal", requiresExpiry: false },
  { name: "Bazar e utilidades", requiresExpiry: false },
  { name: "Pet", requiresExpiry: false },
];

const products: ProductSeed[] = [
  { name: "Arroz Branco Tipo 1 5kg", category: "Mercearia", unitsPerPack: 6, salePrice: "27.90", unitBarcode: true, packBarcode: true },
  { name: "Feijão Carioca 1kg", category: "Mercearia", unitsPerPack: 10, salePrice: "8.49", unitBarcode: true, packBarcode: true },
  { name: "Macarrão Espaguete 500g", category: "Mercearia", unitsPerPack: 20, salePrice: "4.99", unitBarcode: true, packBarcode: false },
  { name: "Açúcar Refinado 1kg", category: "Mercearia", unitsPerPack: 10, salePrice: "5.29", unitBarcode: true, packBarcode: true },
  { name: "Óleo de Soja 900ml", category: "Mercearia", unitsPerPack: 20, salePrice: "7.79", unitBarcode: true, packBarcode: true },
  { name: "Café Torrado e Moído 500g", category: "Mercearia", unitsPerPack: 10, salePrice: "18.90", unitBarcode: true, packBarcode: false },
  { name: "Sal Refinado 1kg", category: "Mercearia", unitsPerPack: 10, salePrice: "2.79", unitBarcode: true, packBarcode: false },
  { name: "Farinha de Trigo 1kg", category: "Mercearia", unitsPerPack: 10, salePrice: "5.99", unitBarcode: true, packBarcode: false },
  { name: "Milho Verde em Conserva 170g", category: "Mercearia", unitsPerPack: 24, salePrice: "3.49", unitBarcode: true, packBarcode: true },
  { name: "Molho de Tomate 340g", category: "Mercearia", unitsPerPack: 24, salePrice: "3.19", unitBarcode: true, packBarcode: false },

  { name: "Coca-Cola Lata 350ml", category: "Bebidas", unitsPerPack: 12, salePrice: "5.50", unitBarcode: true, packBarcode: true },
  { name: "Guaraná Antarctica 2L", category: "Bebidas", unitsPerPack: 6, salePrice: "9.90", unitBarcode: true, packBarcode: true },
  { name: "Água Mineral sem Gás 500ml", category: "Bebidas", unitsPerPack: 12, salePrice: "2.50", unitBarcode: true, packBarcode: true },
  { name: "Suco de Uva Integral 1L", category: "Bebidas", unitsPerPack: 6, salePrice: "16.90", unitBarcode: true, packBarcode: false },
  { name: "Cerveja Pilsen Lata 350ml", category: "Bebidas", unitsPerPack: 12, salePrice: "4.29", unitBarcode: true, packBarcode: true },
  { name: "Energético Lata 250ml", category: "Bebidas", unitsPerPack: 6, salePrice: "8.90", unitBarcode: true, packBarcode: false },

  { name: "Leite Integral 1L", category: "Laticínios e frios", unitsPerPack: 12, salePrice: "6.90", unitBarcode: true, packBarcode: true },
  { name: "Queijo Mussarela Fatiado 150g", category: "Laticínios e frios", unitsPerPack: 10, salePrice: "12.90", unitBarcode: true, packBarcode: false },
  { name: "Iogurte Natural 170g", category: "Laticínios e frios", unitsPerPack: 12, salePrice: "3.99", unitBarcode: true, packBarcode: true },
  { name: "Manteiga com Sal 200g", category: "Laticínios e frios", unitsPerPack: 12, salePrice: "13.50", unitBarcode: true, packBarcode: false },
  { name: "Presunto Cozido Fatiado 200g", category: "Laticínios e frios", unitsPerPack: 10, salePrice: "11.90", unitBarcode: true, packBarcode: false },
  { name: "Requeijão Cremoso 200g", category: "Laticínios e frios", unitsPerPack: 12, salePrice: "8.20", unitBarcode: true, packBarcode: false },

  { name: "Pão de Forma Tradicional", category: "Padaria", unitsPerPack: 10, salePrice: "9.90", unitBarcode: true, packBarcode: false },
  { name: "Pão Francês Unidade", category: "Padaria", unitsPerPack: 50, salePrice: "0.90", unitBarcode: false, packBarcode: false },
  { name: "Bolo de Cenoura Fatia", category: "Padaria", unitsPerPack: 20, salePrice: "6.50", unitBarcode: false, packBarcode: false },

  { name: "Ovo Branco Grande Unidade", category: "Hortifruti", unitsPerPack: 30, salePrice: "1.20", unitBarcode: false, packBarcode: true },
  { name: "Banana Prata Unidade", category: "Hortifruti", unitsPerPack: 60, salePrice: "1.10", unitBarcode: false, packBarcode: false },
  { name: "Batata Inglesa Unidade", category: "Hortifruti", unitsPerPack: 40, salePrice: "1.90", unitBarcode: false, packBarcode: false },

  { name: "Peito de Frango Congelado 1kg", category: "Carnes e congelados", unitsPerPack: 10, salePrice: "18.90", unitBarcode: true, packBarcode: true },
  { name: "Linguiça Toscana 700g", category: "Carnes e congelados", unitsPerPack: 8, salePrice: "22.50", unitBarcode: true, packBarcode: false },
  { name: "Hambúrguer Bovino Congelado 672g", category: "Carnes e congelados", unitsPerPack: 12, salePrice: "24.90", unitBarcode: true, packBarcode: true },

  { name: "Biscoito Recheado Chocolate 130g", category: "Doces e snacks", unitsPerPack: 30, salePrice: "3.29", unitBarcode: true, packBarcode: true },
  { name: "Salgadinho de Milho 90g", category: "Doces e snacks", unitsPerPack: 20, salePrice: "6.90", unitBarcode: true, packBarcode: false },
  { name: "Chocolate ao Leite 90g", category: "Doces e snacks", unitsPerPack: 24, salePrice: "7.50", unitBarcode: true, packBarcode: true },
  { name: "Bala de Goma 100g", category: "Doces e snacks", unitsPerPack: 24, salePrice: "4.20", unitBarcode: true, packBarcode: false },

  { name: "Detergente Neutro 500ml", category: "Limpeza", unitsPerPack: 24, salePrice: "2.80", unitBarcode: true, packBarcode: true },
  { name: "Sabão em Pó 1kg", category: "Limpeza", unitsPerPack: 12, salePrice: "14.90", unitBarcode: true, packBarcode: true },
  { name: "Água Sanitária 1L", category: "Limpeza", unitsPerPack: 12, salePrice: "4.50", unitBarcode: true, packBarcode: false },
  { name: "Desinfetante Pinho 500ml", category: "Limpeza", unitsPerPack: 12, salePrice: "5.90", unitBarcode: true, packBarcode: false },
  { name: "Esponja de Louça Dupla Face", category: "Limpeza", unitsPerPack: 60, salePrice: "1.99", unitBarcode: true, packBarcode: true },

  { name: "Sabonete em Barra 90g", category: "Higiene pessoal", unitsPerPack: 12, salePrice: "2.90", unitBarcode: true, packBarcode: true },
  { name: "Papel Higiênico Folha Dupla 4un", category: "Higiene pessoal", unitsPerPack: 16, salePrice: "12.90", unitBarcode: true, packBarcode: true },
  { name: "Creme Dental 90g", category: "Higiene pessoal", unitsPerPack: 12, salePrice: "6.50", unitBarcode: true, packBarcode: false },
  { name: "Shampoo Anticaspa 350ml", category: "Higiene pessoal", unitsPerPack: 12, salePrice: "19.90", unitBarcode: true, packBarcode: false },

  { name: "Pilha Alcalina AA Cartela 4un", category: "Bazar e utilidades", unitsPerPack: 12, salePrice: "18.90", unitBarcode: true, packBarcode: false },
  { name: "Vela Branca 8h", category: "Bazar e utilidades", unitsPerPack: 24, salePrice: "2.50", unitBarcode: false, packBarcode: false },
  { name: "Isqueiro Descartável", category: "Bazar e utilidades", unitsPerPack: 50, salePrice: "4.90", unitBarcode: true, packBarcode: false },
  { name: "Lâmpada LED 9W", category: "Bazar e utilidades", unitsPerPack: 25, salePrice: "11.90", unitBarcode: true, packBarcode: true },

  { name: "Ração Cão Adulto 1kg", category: "Pet", unitsPerPack: 10, salePrice: "16.90", unitBarcode: true, packBarcode: true },
  { name: "Areia Sanitária Gato 4kg", category: "Pet", unitsPerPack: 6, salePrice: "21.90", unitBarcode: true, packBarcode: false },
];

function createRandom(seed: number) {
  let state = seed;

  return {
    next() {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    },
    between(min: number, max: number) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
  };
}

const random = createRandom(20260829);

function daysFromToday(days: number) {
  return new Date(TODAY.getTime() + days * DAY_IN_MS);
}

function barcodeFor(productIndex: number, isPack: boolean) {
  const base = 7890000000000 + productIndex * 137;
  return String(isPack ? base + 900000000000 : base);
}

function expiryFor(requiresExpiry: boolean) {
  if (!requiresExpiry) {
    return null;
  }

  const roll = random.next();

  if (roll < 0.08) {
    return daysFromToday(random.between(-30, -1));
  }
  if (roll < 0.22) {
    return daysFromToday(random.between(0, 14));
  }
  if (roll < 0.55) {
    return daysFromToday(random.between(15, 90));
  }

  return daysFromToday(random.between(91, 400));
}

function movementsFor(receivedUnits: number, receivedAt: Date) {
  const movements: MovementSeed[] = [
    { type: "ENTRY", quantity: receivedUnits, occurredAt: receivedAt },
  ];

  let remaining = receivedUnits;
  const saleCount = random.between(0, 6);

  for (let sale = 0; sale < saleCount && remaining > 1; sale += 1) {
    const quantity = Math.min(remaining - 1, random.between(1, 4));
    remaining -= quantity;
    movements.push({
      type: "SALE",
      quantity: -quantity,
      occurredAt: daysFromToday(random.between(-20, 0)),
    });
  }

  if (remaining > 2 && random.next() < 0.2) {
    remaining -= 1;
    movements.push({
      type: "LOSS",
      quantity: -1,
      occurredAt: daysFromToday(random.between(-15, 0)),
    });
  }

  if (remaining > 3 && random.next() < 0.15) {
    remaining -= 2;
    movements.push({
      type: "ADJUSTMENT",
      quantity: -2,
      occurredAt: daysFromToday(random.between(-10, 0)),
    });
  }

  return { movements, currentUnits: remaining };
}

function batchesFor(product: ProductSeed, requiresExpiry: boolean) {
  const batchCount = random.between(1, 3);

  return Array.from({ length: batchCount }, () => {
    const packs = random.between(1, 4);
    const receivedUnits = packs * product.unitsPerPack;
    const receivedAt = daysFromToday(-random.between(1, 60));
    const unitCost = Number(product.salePrice) * 0.62;
    const { movements, currentUnits } = movementsFor(receivedUnits, receivedAt);

    return {
      expiresAt: expiryFor(requiresExpiry),
      receivedUnits,
      currentUnits,
      totalCost: (receivedUnits * unitCost).toFixed(2),
      receivedAt,
      movements: { create: movements },
    };
  });
}

function barcodesFor(product: ProductSeed, productIndex: number) {
  const codes = [];

  if (product.unitBarcode) {
    codes.push({
      code: barcodeFor(productIndex, false),
      unitsPerScan: 1,
    });
  }

  if (product.packBarcode) {
    codes.push({
      code: barcodeFor(productIndex, true),
      unitsPerScan: product.unitsPerPack,
    });
  }

  return codes;
}

async function clearDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      movements, sale_items, sales, batches, stock_entries, product_barcodes, products
    RESTART IDENTITY CASCADE
  `);
}

async function ensureCategories() {
  const ids = new Map<string, number>();

  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { name: category.name },
      update: { requiresExpiry: category.requiresExpiry },
      create: category,
    });

    ids.set(saved.name, saved.id);
  }

  return ids;
}

async function seed() {
  await clearDatabase();

  const categoryIds = await ensureCategories();

  for (const [index, product] of products.entries()) {
    const categoryId = categoryIds.get(product.category);

    if (categoryId === undefined) {
      throw new Error(`Unknown category "${product.category}"`);
    }

    const requiresExpiry =
      categories.find((entry) => entry.name === product.category)
        ?.requiresExpiry ?? false;

    await prisma.product.create({
      data: {
        internalCode: `P${String(index + 1).padStart(4, "0")}`,
        name: product.name,
        categoryId,
        unitsPerPack: product.unitsPerPack,
        salePrice: product.salePrice,
        barcodes: { create: barcodesFor(product, index) },
        batches: { create: batchesFor(product, requiresExpiry) },
      },
    });
  }

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    barcodes: await prisma.barcode.count(),
    batches: await prisma.batch.count(),
    movements: await prisma.movement.count(),
  };

  console.log(JSON.stringify({ event: "seed_finished", ...counts }));
}

await seed();
await prisma.$disconnect();
