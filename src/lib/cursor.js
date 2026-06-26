/**
 * Cursor helpers for keyset pagination.
 * Pure utilities — no HTTP, Prisma, or database access.
 */

function encodeCursor(product) {
  if (!product || typeof product !== 'object') {
    throw new Error('encodeCursor: product must be an object');
  }

  const { createdAt, id } = product;

  if (createdAt === undefined || createdAt === null) {
    throw new Error('encodeCursor: product.createdAt is required');
  }

  if (id === undefined || id === null) {
    throw new Error('encodeCursor: product.id is required');
  }

  let createdAtIso;
  if (createdAt instanceof Date) {
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error('encodeCursor: product.createdAt is not a valid date');
    }
    createdAtIso = createdAt.toISOString();
  } else if (typeof createdAt === 'string') {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      throw new Error('encodeCursor: product.createdAt is not a valid date');
    }
    createdAtIso = date.toISOString();
  } else {
    throw new Error('encodeCursor: product.createdAt must be a Date or ISO string');
  }

  const idString =
    typeof id === 'bigint' ? id.toString() : String(id).trim();

  if (!/^\d+$/.test(idString)) {
    throw new Error('encodeCursor: product.id must be a positive integer');
  }

  const payload = {
    createdAt: createdAtIso,
    id: idString,
  };

  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
}

function validateCursor(decodedCursor) {
  if (
    !decodedCursor ||
    typeof decodedCursor !== 'object' ||
    Array.isArray(decodedCursor)
  ) {
    throw new Error('Invalid cursor: expected an object');
  }

  const keys = Object.keys(decodedCursor);
  if (keys.length !== 2 || !keys.includes('createdAt') || !keys.includes('id')) {
    throw new Error('Invalid cursor: must contain only createdAt and id');
  }

  const { createdAt, id } = decodedCursor;

  if (typeof createdAt !== 'string' || createdAt.trim() === '') {
    throw new Error('Invalid cursor: createdAt must be a non-empty string');
  }

  const createdAtDate = new Date(createdAt);
  if (Number.isNaN(createdAtDate.getTime())) {
    throw new Error('Invalid cursor: createdAt is not a valid date');
  }

  const idString = String(id).trim();
  if (!/^\d+$/.test(idString)) {
    throw new Error('Invalid cursor: id must be a positive integer string');
  }

  return {
    createdAt: createdAtDate.toISOString(),
    id: idString,
  };
}

function decodeCursor(cursor) {
  if (typeof cursor !== 'string' || cursor.trim() === '') {
    throw new Error('Invalid cursor: must be a non-empty string');
  }

  let decoded;
  try {
    const json = Buffer.from(cursor.trim(), 'base64url').toString('utf8');
    decoded = JSON.parse(json);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid cursor: malformed JSON');
    }
    throw new Error('Invalid cursor: malformed encoding');
  }

  return validateCursor(decoded);
}

module.exports = {
  encodeCursor,
  decodeCursor,
  validateCursor,
};
