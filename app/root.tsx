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

import { Toaster } from "./components/ui/toaster";
import { requireUser } from "./lib/auth/auth.server";
import { UserRoles } from "./lib/auth/providers.server";
import { getHints } from "./lib/client-hints";
import { getTheme } from "./lib/theme.server";
import { cn } from "./lib/utils";
import "./tailwind.css";

export let links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  let url = new URL(request.url);
  console.log("path", url.pathname);
  let isAuthRoute = [
    "/authenticate",
    "/auth",
    "/needs-permission",
    "/",
  ].includes(url.pathname);

  if (isAuthRoute) return null;

  let user = await requireUser(request);
  console.log(user.signupVerifiedAt == null && user.roleId !== UserRoles.ADMIN);
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
    <html lang="en" className={cn("h-full w-full dark")}>
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
