import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useEventSource } from "remix-utils/sse/react";

export function useReactiveGameLock(id: number) {
  let { toast } = useToast();
  let revokeMessage = useEventSource(`/resources/sse/${id}`, {
    event: "revoke",
  });

  let revokeFinalMessage = useEventSource(`/resources/sse/${id}`, {
    event: "revoke-final",
  });

  let closeMessage = useEventSource(`/resources/sse/${id}`, {
    event: "close",
  });

  useEffect(() => {
    if (revokeMessage) {
      toast({
        title: "Game recalled",
        description:
          "Your borrow voucher has been recalled, make sure to export your save in the next 5 minutes or you might lose it!",
      });
    }

    if (revokeFinalMessage) {
      toast({
        title: "Final warning...",
        description: "You have 30 seconds before this message self destructs",
      });
    }

    if (closeMessage) {
      setTimeout(() => {}, 30_000);
    }
  }, [revokeMessage, revokeFinalMessage]);
}
