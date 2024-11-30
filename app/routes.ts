import { flatRoutes } from "@remix-run/fs-routes";

export default flatRoutes({
  ignoredRouteFiles: [
    ".*", // dotfiles
    "**/*.css", // css files
    "**/*.test.{js,jsx,ts,tsx}", // test files
    "**/__*.*", // __tests__, __mocks__, etc.
    // This is for server-side utilities you want to colocate
    // next to your routes without making an additional
    // directory. If you need a route that includes "server" or
    // "client" in the filename, use the escape brackets like:
    // my-route.[server].tsx
    "**/*.server.*",
    "**/*.client.*",
  ],
});
