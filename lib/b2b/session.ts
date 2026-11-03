import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";
import { getB2BApiEnv } from "../env";
import type { B2BContext, B2BState } from "./types";
export type B2BSession = {
  customer?: NonNullable<B2BState["customer"]>;
  context?: B2BContext;
  cartId?: string;
};
const cookieName = "workshop_b2b";
function key() {
  const env = getB2BApiEnv();
  const secret =
    process.env.B2B_SESSION_SECRET ||
    (process.env.NODE_ENV !== "production" ? env.CTP_CLIENT_SECRET : undefined);
  if (!secret || secret.length < 32)
    throw new Error("Set B2B_SESSION_SECRET to enable business sign-in.");
  return createHash("sha256")
    .update(`b2b-session:${env.CTP_PROJECT_KEY || ""}:${secret}`)
    .digest();
}
export function sealSession(session: B2BSession) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const payload = Buffer.concat([
    cipher.update(
      JSON.stringify({ ...session, expires: Date.now() + 8 * 3600_000 }),
    ),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), payload]).toString(
    "base64url",
  );
}
export function openSession(value?: string): B2BSession {
  if (!value) return {};
  try {
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      bytes.subarray(0, 12),
    );
    decipher.setAuthTag(bytes.subarray(12, 28));
    const data = JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]).toString(),
    );
    if (!Number.isFinite(data.expires) || data.expires < Date.now()) return {};
    return {
      customer: data.customer,
      context: data.context,
      cartId: data.cartId,
    };
  } catch {
    return {};
  }
}
export async function readB2BSession() {
  return openSession((await cookies()).get(cookieName)?.value);
}
export async function writeB2BSession(session: B2BSession) {
  (await cookies()).set(
    cookieName,
    session.customer ? sealSession(session) : "",
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.customer ? 8 * 3600 : 0,
    },
  );
}
