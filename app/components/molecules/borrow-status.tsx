import { Button } from "@/components/ui/button";
import { clearDetailedInfoCache } from "@/lib/cache/cache.client";
import { DetailsIntent } from "@/lib/intents";
import { formatDateTime, isActiveBorrow } from "@/lib/utils";
import { System, User } from "@prisma/client";
import { Form } from "@remix-run/react";
import { Lock } from "lucide-react";
import { Input } from "../ui/input";

interface BorrowStatusProps {
  borrowVoucher: any | null;
  user: User;
  id: number;
  system: System;
}

export function BorrowStatus({
  borrowVoucher,
  user,
  id,
  system,
}: BorrowStatusProps) {
  if (!borrowVoucher || !isActiveBorrow(borrowVoucher)) return null;

  let isMyBorrow = borrowVoucher.user.id === user.id;
  let isAdmin = user.roleId === 1;
  let expirationDate = formatDateTime(borrowVoucher.expiresAt);

  return (
    <div className="mb-4">
      <div className="space-y-2 mb-2 py-4">
        <span className="flex items-center gap-2">
          <Lock size="20" aria-hidden="true" />
          {isMyBorrow
            ? "You're currently playing this"
            : "Someone's playing this"}
        </span>

        <p>
          {isMyBorrow ? (
            <>
              You have borrowed this title until{" "}
              <span className="font-semibold">{expirationDate}</span>.
            </>
          ) : (
            <>
              A user has borrowed this title until{" "}
              <span className="font-semibold">{expirationDate}</span>. It is not
              available to be borrowed.{" "}
            </>
          )}
        </p>

        {isAdmin && !isMyBorrow && (
          <>
            <p>Revoking their lock will remove them from their play session.</p>
            <Form
              method="POST"
              action={`/details/${system.title}/${id}`}
              navigate={false}
              className="pt-2"
              onSubmit={() => clearDetailedInfoCache(id)}
            >
              <Input type="hidden" name="gameId" defaultValue={id} />
              <Input
                type="hidden"
                name="intent"
                value={DetailsIntent.AdminRevokeBorrow}
              />
              <Button variant="destructive" type="submit">
                Revoke lock
              </Button>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
