const { PrismaClient } = require('@prisma/client');

// One PrismaClient per process shares a connection pool; creating many clients
// exhausts DB connections (especially on Neon/serverless limits).
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
