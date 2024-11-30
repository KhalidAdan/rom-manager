import { getGameDetailsData } from "@/lib/game-library";
import { isActiveBorrow as borrowCheck } from "@/lib/utils";
import { action } from "@/routes/details.$system.$id";
import { System, User } from "@prisma/client";
import { useFetcher } from "react-router";
import { Button } from "../atoms/button";
import { BorrowDialog } from "./borrow-dialog";
import { PlayControls } from "./play-controls";

interface GameActionButtonProps {
  borrowVoucher:
    | Awaited<ReturnType<typeof getGameDetailsData>>["borrowVoucher"]
    | null;
  user: User;
  id: number;
  system: System;
  title: string;
}

export function GameActionButton({
  borrowVoucher,
  user,
  id,
  system,
  title,
}: GameActionButtonProps) {
  let activeBorrowVoucher = borrowVoucher && borrowCheck(borrowVoucher);
  let borrowFetcher = useFetcher<typeof action>({ key: "borrow-game" });
  let playFetcher = useFetcher<typeof action>({
    key: "update-last-played-game",
  });

  let hasBorrowError = borrowFetcher.data && "error" in borrowFetcher.data;

  if (!activeBorrowVoucher && !hasBorrowError) {
    return <BorrowDialog id={id} title={title} fetcher={borrowFetcher} />;
  }

  let isMyBorrow = borrowVoucher?.user.id === user.id;

  if (isMyBorrow) {
    return (
      <div className="flex gap-4">
        <PlayControls id={id} system={system} playFetcher={playFetcher} />
      </div>
    );
  }

  return <Button disabled>Not Available</Button>;
}
