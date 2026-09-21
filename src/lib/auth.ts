import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "wc_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 240; // the whole season

function pin(): string {
  const p = process.env.ADMIN_PIN;
  if (!p) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_PIN environment variable is not set");
    }
    return "1234"; // dev fallback
  }
  return p;
}

function token(): string {
  return createHmac("sha256", pin()).update("winter-cup-admin-v1").digest("hex");
}

export function checkPin(candidate: string): boolean {
  const a = Buffer.from(candidate.trim());
  const b = Buffer.from(pin());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function grantAdmin(): Promise<void> {
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function revokeAdmin(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const expected = token();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Not authorised");
}
