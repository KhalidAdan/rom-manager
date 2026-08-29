import { prisma } from "@/lib/prisma.server";

/**
 * Update game metadata
 */
export async function updateGameMetadata(
  gameId: number,
  data: {
    title?: string;
    releaseDate?: number;
    coverArt?: Buffer;
    backgroundImage?: Buffer;
    summary?: string;
  }
) {
  return await prisma.game.update({
    where: { id: gameId },
    data,
    select: {
      id: true,
      system: {
        select: {
          title: true,
        },
      },
    },
  });
}
