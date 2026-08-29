import { UserRoles } from "@/lib/auth/providers.server";
import { ErrorCode } from "@/lib/errors/codes";
import { ErrorFactory } from "@/lib/errors/factory";
import { prisma } from "@/lib/prisma.server";

/**
 * Admin revoke a borrow voucher
 */
export async function adminRevokeBorrow(gameId: number, adminId: number) {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { roleId: true },
  });

  if (admin?.roleId !== UserRoles.ADMIN) {
    throw ErrorFactory.create(ErrorCode.UNAUTHORIZED);
  }

  return await prisma.borrowVoucher.update({
    where: {
      gameId,
      returnedAt: null,
    },
    data: {
      returnedAt: new Date(),
    },
  });
}
