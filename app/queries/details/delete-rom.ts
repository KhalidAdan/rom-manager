import { prisma } from "@/lib/prisma.server";

/**
 * Delete a ROM
 */
export async function deleteGame(id: number) {
  return await prisma.game.delete({
    where: {
      id,
    },
  });
}
