import {
  RefusalConfig,
  RefusalMessages,
  RefusalReason,
} from "@/lib/refusal-reasons";
import { useSearchParams } from "@remix-run/react";
import { useEffect, useState } from "react";

export function useRefusalReason() {
  let [shouldShowToast, setShouldShowToast] = useState(false);
  let [refusalConfig, setRefusalConfig] = useState<RefusalConfig | null>(null);
  let [searchParams] = useSearchParams();

  useEffect(() => {
    let reason = searchParams.get("reason");
    if (!reason) return;

    if (Object.values(RefusalReason).includes(reason as RefusalReason)) {
      let refusalConfig = RefusalMessages[reason as RefusalReason];
      setRefusalConfig(refusalConfig);
      setShouldShowToast(true);
    }
  }, [searchParams]);

  return { shouldShowToast, refusalConfig };
}
