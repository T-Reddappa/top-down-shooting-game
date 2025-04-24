import { PrismaClient } from "../generated/prisma/client";

export const prismaClient = new PrismaClient();

// export * from "@prisma/client";

// Create and export a singleton PrismaClient instance
// const globalForPrisma = global as unknown as { prisma: PrismaClient };

// export const prisma =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     log:
//       process.env.NODE_ENV === "development"
//         ? ["query", "error", "warn"]
//         : ["error"],
//   });

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
