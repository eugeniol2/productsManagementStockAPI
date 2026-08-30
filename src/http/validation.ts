import type { Request, Response } from "express";
import type { z } from "zod";

import { INT4_MAX } from "../database/constraints.ts";
import type { ApiError } from "./errors.ts";

export type ValidationError = {
  field: string;
  code: string;
  message: string;
};

const DIGITS_ONLY = /^\d+$/;
const CODE_FORMAT = /^[A-Za-z0-9-]{1,32}$/;

export function parseId(value: string): number | null {
  if (!DIGITS_ONLY.test(value)) {
    return null;
  }

  const id = Number(value);

  return id >= 1 && id <= INT4_MAX ? id : null;
}

export function isValidCode(value: string) {
  return CODE_FORMAT.test(value);
}

export function rejectInvalid(
  req: Request,
  res: Response,
  error: ApiError,
  failure: z.ZodError,
) {
  const fields = validationErrors(failure);

  console.log(
    JSON.stringify({
      event: "validation_failed",
      method: req.method,
      path: req.originalUrl,
      error: error.body.error,
      fields,
    }),
  );

  res.status(error.status).json({ ...error.body, fields });
}

export function validationErrors(failure: z.ZodError): ValidationError[] {
  return failure.issues.flatMap((issue) =>
    issue.code === "unrecognized_keys"
      ? issue.keys.map((key) => describe(key, issue.code, issue.message))
      : [describe(issue.path.join("."), issue.code, issue.message)],
  );
}

function describe(field: string, code: string, message: string) {
  return { field, code, message };
}
