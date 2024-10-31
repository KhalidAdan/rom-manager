import { User } from "@prisma/client";
import { UserRoles } from "./auth/providers.server";

interface PermissionOptions {
  requireVerified?: boolean;
  adminOnly?: boolean;
}

export function hasPermission(
  user: User,
  options: PermissionOptions = { requireVerified: true }
): boolean {
  if (user.roleId === UserRoles.ADMIN) {
    return true;
  }

  if (options.adminOnly) {
    return false;
  }

  if (options.requireVerified && !user.signupVerifiedAt) {
    return false;
  }

  return true;
}
