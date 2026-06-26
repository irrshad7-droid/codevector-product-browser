require('dotenv').config();

const { PrismaClient, Prisma } = require('@prisma/client');

let prisma = new PrismaClient();

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

const TOTAL = 200000;
const BATCH_SIZE = 5000;
const TOTAL_BATCHES = TOTAL / BATCH_SIZE;

const CATEGORIES = [
  'electronics',
  'clothing',
  'home',
  'sports',
  'books',
  'toys',
  'beauty',
  'garden',
];

const ADJECTIVES = [
  'Premium',
  'Classic',
  'Essential',
  'Pro',
  'Ultra',
  'Compact',
  'Deluxe',
  'Standard',
];

const PRODUCT_TYPES = {
  electronics: ['Speaker', 'Headphones', 'Monitor', 'Keyboard', 'Webcam'],
  clothing: ['Hoodie', 'T-Shirt', 'Jacket', 'Jeans', 'Sneakers'],
  home: ['Lamp', 'Desk', 'Chair', 'Rug', 'Shelf'],
  sports: ['Ball', 'Racket', 'Mat', 'Dumbbell', 'Bottle'],
  books: ['Novel', 'Guide', 'Handbook', 'Atlas', 'Journal'],
  toys: ['Puzzle', 'Figurine', 'Board Game', 'Blocks', 'Doll'],
  beauty: ['Serum', 'Moisturizer', 'Shampoo', 'Palette', 'Lotion'],
  garden: ['Planter', 'Tool Set', 'Seeds', 'Hose', 'Gnome'],
};

const PRICE_MIN_CENTS = 500;
const PRICE_MAX_CENTS = 50000;
const PRICE_RANGE = PRICE_MAX_CENTS - PRICE_MIN_CENTS + 1;

// Spread createdAt across ~365 days; index 0 = newest, index 199999 = oldest.
const SPREAD_MS = 365 * 24 * 60 * 60 * 1000;
const CREATED_AT_INTERVAL_MS = SPREAD_MS / TOTAL;
const SEED_BASE_TIME_MS = Date.now();

function buildProduct(globalIndex) {
  const category = CATEGORIES[globalIndex % CATEGORIES.length];
  const types = PRODUCT_TYPES[category];
  const type = types[globalIndex % types.length];
  const adjective = ADJECTIVES[(globalIndex >> 3) % ADJECTIVES.length];
  const name = `${adjective} ${type} (${category}) #${globalIndex + 1}`;
  const price = PRICE_MIN_CENTS + Math.floor(Math.random() * PRICE_RANGE);
  const createdAt = new Date(SEED_BASE_TIME_MS - globalIndex * CREATED_AT_INTERVAL_MS);

  return {
    name,
    category,
    price,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildBatch(batchIndex) {
  const startIndex = batchIndex * BATCH_SIZE;
  const batch = new Array(BATCH_SIZE);

  for (let i = 0; i < BATCH_SIZE; i++) {
    batch[i] = buildProduct(startIndex + i);
  }

  return batch;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isConnectionError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1017', 'P1001', 'P1008'].includes(error.code);
  }

  const message = error?.message ?? '';
  return message.includes('Server has closed the connection');
}

async function reconnectPrisma() {
  try {
    await prisma.$disconnect();
  } catch {
    // Connection may already be dead (e.g. P1017).
  }
  prisma = new PrismaClient();
}

async function insertBatch(data, batchNumber) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.product.createMany({ data });
      return;
    } catch (error) {
      const canRetry = isConnectionError(error) && attempt < MAX_RETRIES;

      if (!canRetry) {
        throw error;
      }

      const waitMs = BACKOFF_MS[attempt];
      console.warn(
        `Batch ${batchNumber} connection error (${error.code ?? 'unknown'}): ${error.message}. ` +
          `Retry ${attempt + 1}/${MAX_RETRIES} in ${waitMs / 1000}s...`,
      );

      await reconnectPrisma();
      await sleep(waitMs);
    }
  }
}

async function main() {
  const startTime = Date.now();

  console.log(`Seeding ${TOTAL} products in batches of ${BATCH_SIZE}...`);

  await prisma.product.deleteMany();
  console.log('Cleared existing products.');

  for (let batchIndex = 0; batchIndex < TOTAL_BATCHES; batchIndex++) {
    const data = buildBatch(batchIndex);
    await insertBatch(data, batchIndex + 1);

    const rowsDone = (batchIndex + 1) * BATCH_SIZE;
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `Batch ${batchIndex + 1}/${TOTAL_BATCHES} — ${rowsDone}/${TOTAL} rows — ${elapsedSeconds}s elapsed`,
    );
  }

  const count = await prisma.product.count();
  const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

  if (count !== TOTAL) {
    throw new Error(`Expected ${TOTAL} products after seed, found ${count}.`);
  }

  console.log(`Done. ${count} products in database. Total time: ${totalSeconds}s`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
