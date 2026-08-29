import { prisma } from "@/lib/prisma.server";

/**
 * Update last played time for a game
 */
export async function updateLastPlayed(gameId: number, userId: number) {
  // Update or create game stats
  await prisma.gameStats.upsert({
    where: {
      userId_gameId: {
        userId,
        gameId,
      },
    },
    create: {
      lastPlayedAt: new Date(),
      gameId,
      userId,
    },
    update: {
      lastPlayedAt: new Date(),
    },
  });

  // Update game's borrow status
  await prisma.game.update({
    where: {
      id: gameId,
    },
    data: {
      borrowVoucher: {
        connect: {
          id: userId,
        },
      },
    },
  });

  return { success: true };
}
