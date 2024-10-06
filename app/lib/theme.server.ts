import * as cookie from "cookie";

let cookieName = "en_theme";
export type Theme = "light" | "dark";

export function getTheme(request: Request): Theme | null {
  let cookieHeader = request.headers.get("cookie");
  let parsed = cookieHeader ? cookie.parse(cookieHeader)[cookieName] : "light";
  if (parsed === "light" || parsed === "dark") return parsed;
  return null;
}

export function setTheme(theme: Theme | "system") {
  if (theme === "system") {
    return cookie.serialize(cookieName, "", {
      path: "/",
      maxAge: -1,
      sameSite: "lax",
    });
  } else {
    return cookie.serialize(cookieName, theme, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  }
}
