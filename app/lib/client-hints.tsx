import { getHintUtils } from "@epic-web/client-hints";
import {
  clientHint as colorSchemeHint,
  subscribeToSchemeChange,
} from "@epic-web/client-hints/color-scheme";
import { useRevalidator } from "react-router";
import React from "react";
import { useRequestInfo } from "./request-info";

let hintsUtils = getHintUtils({
  theme: colorSchemeHint,
});

export let { getHints } = hintsUtils;

export function useHints() {
  let requestInfo = useRequestInfo();
  return requestInfo.hints;
}

export function ClientHintCheck({ nonce }: { nonce: string }) {
  let { revalidate } = useRevalidator();
  React.useEffect(
    () => subscribeToSchemeChange(() => revalidate()),
    [revalidate]
  );

  return (
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: hintsUtils.getClientHintCheckScript(),
      }}
    />
  );
}
