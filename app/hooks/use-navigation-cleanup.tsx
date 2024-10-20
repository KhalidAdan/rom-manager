import { useNavigate } from "@remix-run/react";
import { useEffect } from "react";

export function useNavigationCleanup(cleanUpFn: () => void) {
  let navigate = useNavigate();
  useEffect(() => {
    let handleBeforeNavigate = (event: MouseEvent) => {
      let target = event.target as HTMLAnchorElement;
      if (target.tagName === "A" && target.href) {
        event.preventDefault();
        cleanUpFn();
        navigate(target.href);
      }
    };

    document.body.addEventListener("click", handleBeforeNavigate);

    return () => {
      document.body.removeEventListener("click", handleBeforeNavigate);
    };
  }, [navigate, cleanUpFn]);
}
