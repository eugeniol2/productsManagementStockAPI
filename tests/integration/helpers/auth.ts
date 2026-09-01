import { exportSPKI, generateKeyPair, SignJWT } from "jose";

const keys = await generateKeyPair("RS256", { extractable: true });

process.env.JWT_PUBLIC_KEY = Buffer.from(await exportSPKI(keys.publicKey)).toString(
  "base64",
);

export function signToken(payload: Record<string, unknown> = {}, expiration = "1h") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setExpirationTime(expiration)
    .setIssuedAt()
    .sign(keys.privateKey);
}

export async function signWithOtherKey(payload: Record<string, unknown> = {}) {
  const other = await generateKeyPair("RS256", { extractable: true });

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setExpirationTime("1h")
    .sign(other.privateKey);
}
