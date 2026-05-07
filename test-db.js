import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Using connection string:', connectionString ? connectionString.substring(0, 20) + '...' : 'UNDEFINED');
  
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Testing connection...');
    const result = await prisma.user.findFirst();
    console.log('Success! Found user:', result ? result.id : 'NONE');
  } catch (error) {
    console.error('Error in script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
