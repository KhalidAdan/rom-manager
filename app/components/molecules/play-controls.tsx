import { Button, buttonVariants } from "@/components/atoms/button";
import { DetailsIntent } from "@/lib/intents";
import { System } from "@/generated/prisma/client";
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
