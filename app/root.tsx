import {
  type LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
  json,
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
import { getHints } from "./lib/client-hints";
import { getTheme } from "./lib/theme.server";
import "./tailwind.css";

export const meta: MetaFunction = () => {
  return [
    {
      title: `ROMSTHO${process.env.NODE_ENV == "development" ? ":DEV" : ""}`,
    },
    { name: "description", content: "Your personal ROM collection manager" },

    // PWA meta tags
    { name: "theme-color", content: "#000000" },
    {
      name: "viewport",
      content: "width=device-width,initial-scale=1,viewport-fit=cover",
    },
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "black" },
    { name: "apple-mobile-web-app-title", content: "ROMSTHO" },

    // PWA icons for iOS
    {
      rel: "apple-touch-icon",
      sizes: "192x192",
      href: "/icons/icon-192x192.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "512x512",
      href: "/icons/icon-512x512.png",
    },

    // Manifest link
    { rel: "manifest", href: "/manifest.json" },

    // Optional: Suppress automatic phone number detection
    { name: "format-detection", content: "telephone=no" },
  ];
};

export let links: LinksFunction = () => [
  {
    rel: "preload",
    href: interRegular,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: interItalic,
    as: "font",
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
