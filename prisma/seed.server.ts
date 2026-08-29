// import { userRoles } from "@/lib/auth/providers.server";
// import { PrismaClient } from "@/generated/prisma/client";
// let prisma = new PrismaClient();

// async function main() {
//   console.log("🌱 Seeding...");

//   let roles = await prisma.role.createMany({
//     data: Object.keys(userRoles).map((key) => ({
//       id: userRoles[key as keyof typeof userRoles],
//       title: key,
//     })),
//   });

//   console.log("🌱 Database has been seeded.");
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
