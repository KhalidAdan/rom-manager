import { loader } from "@/root";
import { invariant } from "@epic-web/invariant";
import { useRouteLoaderData } from "@remix-run/react";

export function useRequestInfo() {
  let data = useRouteLoaderData<typeof loader>("root");
  invariant(data?.requestInfo, "No requestInfo found in root loader");

  return data?.requestInfo;
}
