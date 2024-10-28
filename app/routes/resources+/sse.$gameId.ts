import { requireUser } from "@/lib/auth/auth.server";
import { prisma } from "@/lib/prisma.server";
import type { LoaderFunctionArgs } from "@remix-run/node";

import { eventStream } from "remix-utils/sse/server";

const USER_PERMISSIONS_REVOKED_TIMEOUT = 15_000;
const POLLING_FREQUENCY = 3_000;

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
            event: "message",
            data: JSON.stringify({
              type: "revoke",
              message: "Warning User",
            }),
          });
          revokeSent = true;

          revokeFinalTimer = setTimeout(() => {
            console.log("revoking final user lock");
            send({
              event: "message",
              data: JSON.stringify({
                type: "revoke-final",
                message: "Revoking user lock on game",
              }),
            });
            setTimeout(() => {
              send({
                event: "message",
                data: JSON.stringify({
                  type: "close",
                  message: "Session terminated",
                }),
              });
              abort();
            }, 30_000);
          }, USER_PERMISSIONS_REVOKED_TIMEOUT - 30_000);
        }
      } catch (error) {
        console.error("Error checking revocation:", error);
        send({
          event: "message",
          data: JSON.stringify({
            type: "error",
            message: "An error occurred",
          }),
        });
        abort();
      }
    }

    checkRevocation().catch(console.error);

    const interval = setInterval(() => {
      console.log("SSE sent to client");
      checkRevocation().catch(console.error);
    }, POLLING_FREQUENCY);

    return function cleanup() {
      console.log("cleaning up the SSE connection");
      clearInterval(interval);
      if (revokeFinalTimer) clearTimeout(revokeFinalTimer);
    };
  });
}
