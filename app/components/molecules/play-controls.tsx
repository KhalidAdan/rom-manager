import { Button, buttonVariants } from "@/components/atoms/button";
import { getCacheManager } from "@/lib/cache/cache.client";
import { DetailsIntent } from "@/lib/intents";
import { System } from "@prisma/client";
import { FetcherWithComponents, Form, Link } from "react-router";

interface PlayControlsProps {
  id: number;
  system: System;
  playFetcher: FetcherWithComponents<any>;
}

export function PlayControls({ id, system, playFetcher }: PlayControlsProps) {
  return (
    <>
      <Link
        to={`/play/${system.title}/${id}`}
        className={buttonVariants({ variant: "default" })}
        onClick={() => {
          playFetcher.submit(
            { intent: DetailsIntent.UpdateLastPlayed, gameId: id },
            { method: "POST" }
          );
        }}
      >
        Play Now
      </Link>
      <Form
        method="POST"
        action={`/details/${system.title}/${id}`}
        onSubmit={() => getCacheManager().detailedInfo.clear()}
      >
        <input type="hidden" name="intent" value={DetailsIntent.ReturnGame} />
        <input type="hidden" name="gameId" value={id} />
        <Button
          type="submit"
          variant="outline"
          disabled={playFetcher.state === "submitting"}
        >
          Return Game
        </Button>
      </Form>
    </>
  );
}
