import type { Response } from "express";

export type ApiError = {
  status: number;
  body: { error: string };
};

export const INVALID_QUERY = { status: 400, body: { error: "INVALID_QUERY" } };
export const INVALID_SALE = { status: 400, body: { error: "INVALID_SALE" } };
export const INVALID_PRODUCT_ID = {
  status: 400,
  body: { error: "INVALID_PRODUCT_ID" },
};
export const INVALID_CODE = { status: 400, body: { error: "INVALID_CODE" } };
export const INVALID_PRICE = { status: 400, body: { error: "INVALID_PRICE" } };
export const INVALID_STOCK_ENTRY = {
  status: 400,
  body: { error: "INVALID_STOCK_ENTRY" },
};
export const EXPIRY_REQUIRED = { status: 400, body: { error: "EXPIRY_REQUIRED" } };
export const INVALID_JSON = { status: 400, body: { error: "INVALID_JSON" } };
export const UNAUTHORIZED = { status: 401, body: { error: "UNAUTHORIZED" } };
export const PRODUCT_NOT_FOUND = {
  status: 404,
  body: { error: "PRODUCT_NOT_FOUND" },
};
export const NOT_FOUND = { status: 404, body: { error: "NOT_FOUND" } };
export const PAYLOAD_TOO_LARGE = {
  status: 413,
  body: { error: "PAYLOAD_TOO_LARGE" },
};
export const INTERNAL_ERROR = {
  status: 500,
  body: { error: "INTERNAL_ERROR" },
};

export function fail(res: Response, error: ApiError) {
  res.status(error.status).json(error.body);
}
