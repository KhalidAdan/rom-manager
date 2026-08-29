import { parseCookie, stringifySetCookie } from "cookie";

let cookieName = "en_theme";
export type Theme = "light" | "dark";

export function getTheme(request: Request): Theme | null {
  let cookieHeader = request.headers.get("cookie");
  let parsed = cookieHeader ? parseCookie(cookieHeader)[cookieName] : "light";
  if (parsed === "light" || parsed === "dark") return parsed;
  return null;
}

export function setTheme(theme: Theme | "system") {
  if (theme === "system") {
    return stringifySetCookie({
      name: cookieName,
      value: "",
      path: "/",
      maxAge: -1,
      sameSite: "lax",
    });
  } else {
    return stringifySetCookie({
      name: cookieName,
      value: theme,
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  }
}
