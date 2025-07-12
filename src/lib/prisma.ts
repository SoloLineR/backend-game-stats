import { PrismaClient } from '../../generated/prisma';

// Ensures a single instance of PrismaClient is used across the application.
const prisma = new PrismaClient();

export { prisma };
