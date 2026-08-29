import { ErrorCode } from "@/lib/errors/codes";
import { ErrorFactory } from "@/lib/errors/factory";
import { prisma } from "@/lib/prisma.server";

/**
 * Return a borrowed game
 */
export async function returnGame(gameId: number, userId: number) {
  const voucher = await prisma.borrowVoucher.findFirst({
    where: {
      gameId,
      userId,
      returnedAt: null,
    },
  });

  if (!voucher) {
    throw ErrorFactory.create(ErrorCode.GAME_NOT_BORROWED);
  }

  return await prisma.borrowVoucher.update({
    where: { id: voucher.id },
    data: { returnedAt: new Date() },
  });
}
