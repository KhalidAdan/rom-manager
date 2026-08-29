import { prisma } from "@/lib/prisma.server";

/**
 * Update game metadata
 */
export async function updateGameMetadata(
  gameId: number,
  data: {
    title?: string;
    releaseDate?: number;
    coverArt?: Uint8Array<ArrayBuffer>;
    backgroundImage?: Uint8Array<ArrayBuffer>;
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
