import { UserRoles } from "@/lib/auth/providers.server";
import { ErrorCode } from "@/lib/errors/codes";
import { ErrorFactory } from "@/lib/errors/factory";
import { prisma } from "@/lib/prisma.server";

/**
 * Admin revoke a borrow voucher
 */
export async function adminRevokeBorrow(gameId: number, adminId: number) {
  let admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { roleId: true },
  });

  if (admin?.roleId !== UserRoles.ADMIN) {
    throw ErrorFactory.create(ErrorCode.FORBIDDEN);
  }

  let voucher = await prisma.borrowVoucher.findFirst({
    where: {
      gameId,
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
