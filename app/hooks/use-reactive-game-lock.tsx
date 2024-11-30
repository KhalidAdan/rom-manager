import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
//import { useEventSource } from "remix-utils/sse/react";

interface GameLockStatus {
  isRevoked: boolean;
  isFinalWarning: boolean;
  isClosed: boolean;
}

export function useReactiveGameLock(id: number) {
  let { toast } = useToast();
  let [status, setStatus] = useState<GameLockStatus>({
    isRevoked: false,
    isFinalWarning: false,
    isClosed: false,
  });
  let eventMessage = useEventSource(`/resources/sse/${id}`);

  useEffect(() => {
    if (!eventMessage) return;

    try {
      const event = JSON.parse(eventMessage);

      switch (event.type) {
        case "revoke":
          setStatus((prev) => ({ ...prev, isRevoked: true }));
          toast({
            title: "Game recalled",
            description:
              "Your borrow voucher has been recalled, make sure to export your save in the next 5 minutes or you might lose it!",
          });
          break;

        case "revoke-final":
          setStatus((prev) => ({ ...prev, isFinalWarning: true }));
          toast({
            title: "Final warning...",
            description:
              "You have 30 seconds before this message self destructs (and ytou get booted off!)",
          });
          break;

        case "close":
          setStatus((prev) => ({ ...prev, isClosed: true }));
          // Handle close logic
          break;
      }
    } catch (error) {
      console.error("Error parsing event message:", error);
    }
  }, [eventMessage, toast]);

  return status;
}
