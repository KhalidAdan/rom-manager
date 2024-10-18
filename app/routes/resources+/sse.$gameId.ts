import { requireUser } from "@/lib/auth/auth.server";
import { prisma } from "@/lib/prisma.server";
import type { LoaderFunctionArgs } from "@remix-run/node";

import { eventStream } from "remix-utils/sse/server";

let userSessionStore: {
  [userId: string]: { timer?: NodeJS.Timeout; revoked: boolean };
} = {};

const USER_PERMISSIONS_REVOKED_TIMEOUT = 600_000;
const POLLING_FREQUENCY = 6_000;

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUser(request);
  let gameId = params.gameId;

  return eventStream(request.signal, (send, abort) => {
    let revokeSent = false;
    let revokeFinalTimer: NodeJS.Timeout | null = null;

    async function checkRevocation() {
      try {
        let game = await prisma.game.findUniqueOrThrow({
          where: { id: Number(gameId) },
        });
        if (game.userId === null && !revokeSent) {
          send({
            event: "revoke",
            data: "Warning User",
          });
          revokeSent = true;

          revokeFinalTimer = setTimeout(() => {
            send({
              event: "revoke-final",
              data: "Revoking user lock on game",
            });
            send({ event: "close", data: "" });
            abort();
          }, USER_PERMISSIONS_REVOKED_TIMEOUT);
        }
      } catch (error) {
        console.error("Error checking revocation:", error);
        send({ event: "error", data: "An error occurred" });
        abort();
      }
    }

    let interval = setInterval(async () => {
      console.log("pinging");
      await checkRevocation();
    }, POLLING_FREQUENCY);

    return function cleanup() {
      clearInterval(interval);
      if (revokeFinalTimer) clearTimeout(revokeFinalTimer);
    };
  });
}
