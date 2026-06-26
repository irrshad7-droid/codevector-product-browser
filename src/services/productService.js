const prisma = require('../db');
const { decodeCursor, encodeCursor } = require('../lib/cursor');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseLimit(limit) {
  const value =
    limit === undefined || limit === null ? DEFAULT_LIMIT : Number(limit);

  if (!Number.isInteger(value) || value < 1 || value > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  return value;
}

function toProduct(product) {
  return {
    id: product.id.toString(),
    name: product.name,
    category: product.category,
    price: product.price,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function buildWhere(category, cursor) {
  const where = {};

  if (
    category !== undefined &&
    category !== null &&
    String(category).trim() !== ''
  ) {
    where.category = String(category).trim();
  }

  if (!cursor) {
    return where;
  }

  const { createdAt, id } = decodeCursor(cursor);
  const cursorDate = new Date(createdAt);
  const cursorId = BigInt(id);

  // Keyset: rows strictly after the cursor in (createdAt DESC, id DESC) order.
  where.OR = [
    { createdAt: { lt: cursorDate } },
    { createdAt: cursorDate, id: { lt: cursorId } },
  ];

  return where;
}

async function getProducts({ category, cursor, limit } = {}) {
  const pageLimit = parseLimit(limit);
  const where = buildWhere(category, cursor);

  const rows = await prisma.product.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: pageLimit + 1,
  });

  const hasMore = rows.length > pageLimit;
  const pageRows = hasMore ? rows.slice(0, pageLimit) : rows;
  const data = pageRows.map(toProduct);

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? encodeCursor({ createdAt: lastRow.createdAt, id: lastRow.id })
      : null;

  return {
    data,
    nextCursor,
    hasMore,
  };
}

module.exports = {
  getProducts,
};
