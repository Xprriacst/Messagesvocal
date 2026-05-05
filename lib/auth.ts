import { cookies } from "next/headers";

const COOKIE_NAME = "voicecast_auth";

export function authConfigured() {
  return Boolean(process.env.APP_PASSWORD);
}

export async function isAuthed() {
  if (!authConfigured()) return true;
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value === process.env.APP_PASSWORD;
}

export async function setAuthCookie() {
  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value: process.env.APP_PASSWORD ?? "",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearAuthCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
