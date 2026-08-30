import { describe, expect, it } from "vitest";

import { saleItemSchema, saleSchema } from "./sales.schema.ts";

const item = { productId: 1, quantity: 2 };
const key = "74c2c2b6-7c49-429d-a32a-647b40045def";

describe("saleItemSchema", () => {
  it("accepts a whole-unit item", () => {
    expect(saleItemSchema.safeParse(item).success).toBe(true);
  });

  it("rejects a zero quantity", () => {
    expect(
      saleItemSchema.safeParse({ productId: 1, quantity: 0 }).success,
    ).toBe(false);
  });

  it("rejects a negative quantity", () => {
    expect(
      saleItemSchema.safeParse({ productId: 1, quantity: -1 }).success,
    ).toBe(false);
  });

  it("rejects a fractional quantity", () => {
    expect(
      saleItemSchema.safeParse({ productId: 1, quantity: 0.35 }).success,
    ).toBe(false);
  });

  it("rejects a quantity sent as text", () => {
    expect(
      saleItemSchema.safeParse({ productId: 1, quantity: "2" }).success,
    ).toBe(false);
  });

  it("rejects a missing productId", () => {
    expect(saleItemSchema.safeParse({ quantity: 2 }).success).toBe(false);
  });
});

describe("saleSchema", () => {
  it("accepts a basket with several items", () => {
    const basket = {
      idempotencyKey: key,
      items: [
        { productId: 1, quantity: 2 },
        { productId: 7, quantity: 3 },
        { productId: 9, quantity: 1 },
      ],
    };

    expect(saleSchema.safeParse(basket).success).toBe(true);
  });

  it("requires an idempotency key", () => {
    expect(saleSchema.safeParse({ items: [item] }).success).toBe(false);
  });

  it("rejects an idempotency key that is not a uuid", () => {
    const basket = { idempotencyKey: "pdv-0001", items: [item] };

    expect(saleSchema.safeParse(basket).success).toBe(false);
  });

  it("rejects a basket without items", () => {
    expect(saleSchema.safeParse({ idempotencyKey: key, items: [] }).success).toBe(
      false,
    );
  });

  it("rejects a body that has no items field", () => {
    expect(saleSchema.safeParse({ idempotencyKey: key }).success).toBe(false);
  });

  it("rejects a null body", () => {
    expect(saleSchema.safeParse(null).success).toBe(false);
  });

  it("rejects a body that is not an object", () => {
    expect(saleSchema.safeParse(123).success).toBe(false);
  });

  it("reports which item was rejected", () => {
    const basket = {
      idempotencyKey: key,
      items: [item, { productId: 7, quantity: -1 }],
    };

    const result = saleSchema.safeParse(basket);

    if (result.success) {
      throw new Error("expected a negative quantity to be rejected");
    }

    expect(result.error.issues[0]?.path).toEqual(["items", 1, "quantity"]);
  });

  it("strips fields that were not declared", () => {
    const basket = saleSchema.parse({
      idempotencyKey: key,
      items: [{ ...item, unitPrice: 0 }],
      operator: "ignorado",
    });

    expect(basket).toEqual({ idempotencyKey: key, items: [item] });
  });
});
