// Session cookie helpers. OAuth code-exchange lives in step 3.3.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ensureBootstrapped } from "../db/bootstrap";
import { getUserFromSession } from "../domain/sessions";
import type { User } from "../domain/types";

export const SESSION_COOKIE = "meepo_session";
const IS_PROD = process.env.NODE_ENV === "production";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function currentUser(req: NextRequest): User | null {
  ensureBootstrapped();
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (!token) return null;
  return getUserFromSession(token);
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: IS_PROD,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: IS_PROD,
  });
}
