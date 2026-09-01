import type { NextFunction, Request, Response } from "express";
import { importSPKI, jwtVerify } from "jose";

import { UNAUTHORIZED, fail } from "./errors.ts";

const ALGORITHM = "RS256";
const BEARER = /^Bearer (.+)$/;

let publicKey: ReturnType<typeof importSPKI> | null = null;

function bearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  return BEARER.exec(header)?.[1] ?? null;
}

function loadPublicKey() {
  if (!publicKey) {
    const encoded = process.env.JWT_PUBLIC_KEY;

    if (!encoded) {
      throw new Error("JWT_PUBLIC_KEY is not set");
    }

    publicKey = importSPKI(Buffer.from(encoded, "base64").toString("utf8"), ALGORITHM);
  }

  return publicKey;
}


export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req.headers.authorization);

  if (!token) {
    fail(res, UNAUTHORIZED);
    return;
  }

  const key = await loadPublicKey();

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: [ALGORITHM] });
    res.locals.auth = payload;
    next();
  } catch {
    fail(res, UNAUTHORIZED);
  }
}

