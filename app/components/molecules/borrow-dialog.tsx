import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { getCacheManager } from "@/lib/cache/cache.client";
import { DetailsIntent } from "@/lib/intents";
import { FetcherWithComponents } from "@remix-run/react";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

interface BorrowDialogProps {
  id: number;
  title: string;
  fetcher: FetcherWithComponents<any>;
}

export function BorrowDialog({ id, title, fetcher }: BorrowDialogProps) {
  let [open, setOpen] = useState(false);
  let hasError = fetcher.data?.error;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          fetcher.data = undefined;
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Borrow Game</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrow {title}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          This will allow you to play this game for the next 7 days. You can
          have up to 3 games borrowed at a time.
        </DialogDescription>

        {hasError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{fetcher.data.error}</AlertDescription>
          </Alert>
        )}
        <fetcher.Form
          method="POST"
          onSubmit={() => getCacheManager().detailedInfo.clear()}
        >
          <input type="hidden" name="intent" value={DetailsIntent.BorrowGame} />
          <input type="hidden" name="gameId" value={id} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={fetcher.state === "submitting" || fetcher.data?.error}
            >
              {fetcher.state === "submitting"
                ? "Borrowing..."
                : "Confirm Borrow"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
