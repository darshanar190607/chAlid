import { PrismaClient } from "@prisma/client";
import { neonConfig, Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Use standard global pattern for Next.js HMR
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  adapter: PrismaNeon | undefined;
  pool: Pool | undefined;
};

// Check if we need to initialize
if (!globalForPrisma.prisma) {
  console.log("Initializing Prisma Client with Neon Serverless adapter...");
  
  if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws;
  }

  const connectionString = process.env.DATABASE_URL!;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  
  globalForPrisma.pool = pool;
  globalForPrisma.adapter = adapter;
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: ["query", "info", "warn", "error"],
  });
}

export const prisma = globalForPrisma.prisma;
