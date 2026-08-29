import { BORROW_LIMIT, SEVEN_DAYS_MS } from "@/lib/const";
import { ErrorCode } from "@/lib/errors/codes";
import { ErrorFactory } from "@/lib/errors/factory";
import { prisma } from "@/lib/prisma.server";

/**
 * Borrow a game for a user
 */
export async function borrowGame(gameId: number, userId: number) {
  // Check if user has reached their borrow limit
  let activeBorrows = await prisma.borrowVoucher.findMany({
    where: {
      userId,
      returnedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      game: {
        select: {
          title: true,
        },
      },
    },
  });

  if (activeBorrows.length >= BORROW_LIMIT) {
    throw ErrorFactory.create(
      ErrorCode.BORROW_LIMIT_REACHED,
      `You can only borrow up to ${BORROW_LIMIT} games at a time. You've borrowed ${activeBorrows
        .map((ab) => ab.game.title)
        .join(", ")}`
    );
  }

  // Check if game is already borrowed
  let existingVoucher = await prisma.borrowVoucher.findFirst({
    where: {
      gameId,
      returnedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingVoucher) {
    throw ErrorFactory.create(ErrorCode.GAME_BORROWED);
  }

  // Create or update the borrow voucher
  return await prisma.borrowVoucher.upsert({
    where: {
      gameId,
    },
    create: {
      gameId,
      userId,
      expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
    },
    update: {
      gameId,
      userId,
      expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
      returnedAt: null,
    },
  });
}
