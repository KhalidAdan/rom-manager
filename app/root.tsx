import {
  type LinksFunction,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import interItalic from "/fonts/Inter/Inter-Italic-VariableFont_opsz,wght.ttf";
import interRegular from "/fonts/Inter/Inter-VariableFont_opsz,wght.ttf";

import instrumentSansItalic from "/fonts/InstrumentSans/InstrumentSans-Italic-VariableFont_wdth,wght.ttf";
import instrumentSansRegular from "/fonts/InstrumentSans/InstrumentSans-VariableFont_wdth,wght.ttf";

import instrumentSerifItalic from "/fonts/InstrumentSerif/InstrumentSerif-Italic.ttf";
import instrumentSerifRegular from "/fonts/InstrumentSerif/InstrumentSerif-Regular.ttf";

import spaceMonoBold from "/fonts/SpaceMono/SpaceMono-Bold.ttf";
import spaceMonoBoldItalic from "/fonts/SpaceMono/SpaceMono-BoldItalic.ttf";
import spaceMonoItalic from "/fonts/SpaceMono/SpaceMono-Italic.ttf";
import spaceMonoRegular from "/fonts/SpaceMono/SpaceMono-Regular.ttf";

import { Toaster } from "./components/ui/toaster";
import { requireUser } from "./lib/auth/auth.server";
import { UserRoles } from "./lib/auth/providers.server";
import { getHints } from "./lib/client-hints";
import { getTheme } from "./lib/theme.server";
import "./tailwind.css";

export let links: LinksFunction = () => [
  {
    rel: "preload",
    href: interRegular as "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: interItalic as "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: instrumentSansRegular,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: instrumentSansItalic,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: instrumentSerifRegular,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: instrumentSerifItalic,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: spaceMonoRegular,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: spaceMonoBold,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: spaceMonoItalic,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: spaceMonoBoldItalic,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  let url = new URL(request.url);
  let isAuthRoute = [
    "/authenticate",
    "/auth",
    "/needs-permission",
    "/",
  ].includes(url.pathname);

  if (isAuthRoute) return null;

  let user = await requireUser(request);
  if (user.signupVerifiedAt == null && user.roleId !== UserRoles.ADMIN) {
    return redirect("/needs-permission");
  }

  return json({
    requestInfo: {
      hints: getHints(request),
      userPrefs: {
        theme: getTheme(request),
      },
    },
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full w-full dark select-none">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full w-full">
        {children}
        <Toaster />
        <ScrollRestoration
          getKey={(location) => {
            return location.pathname;
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
