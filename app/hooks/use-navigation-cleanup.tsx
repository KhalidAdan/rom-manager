import { useEffect } from "react";

export function useNavigationCleanup(cleanUpFn: () => void) {
  useEffect(() => {
    let handlePopState = (_event: PopStateEvent) => {
      if (window.EJS_emulator) {
        cleanUpFn();
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [cleanUpFn]);
}
