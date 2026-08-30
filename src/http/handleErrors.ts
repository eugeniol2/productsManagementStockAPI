import type { NextFunction, Request, Response } from "express";

import {
  type ApiError,
  INTERNAL_ERROR,
  INVALID_JSON,
  PAYLOAD_TOO_LARGE,
  fail,
} from "./errors.ts";

export function handleErrors(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const classified = classify(error);

  console.log(
    JSON.stringify({
      event: "request_failed",
      method: req.method,
      path: req.originalUrl,
      status: classified.status,
      responded: !res.headersSent,
      message: error.message,
      stack: classified.status < 500 ? undefined : error.stack,
    }),
  );

  if (res.headersSent) {
    next(error);
    return;
  }

  fail(res, classified);
}

function classify(error: Error): ApiError {
  if (isMalformedJson(error)) {
    return INVALID_JSON;
  }
  if (isPayloadTooLarge(error)) {
    return PAYLOAD_TOO_LARGE;
  }
  return INTERNAL_ERROR;
}

function isMalformedJson(error: Error) {
  return error instanceof SyntaxError && "body" in error;
}

function isPayloadTooLarge(error: Error) {
  return "type" in error && error.type === "entity.too.large";
}
