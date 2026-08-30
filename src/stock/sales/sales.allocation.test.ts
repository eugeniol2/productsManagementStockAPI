import { describe, expect, it } from "vitest";

import {
  allocateByExpiry,
  type AllocatableBatch,
} from "./sales.allocation.ts";

function batch(
  id: number,
  expiresAt: string | null,
  currentUnits: number,
): AllocatableBatch {
  return {
    id,
    expiresAt: expiresAt === null ? null : new Date(expiresAt),
    currentUnits,
  };
}

describe("allocateByExpiry", () => {
  it("takes everything from a single batch that covers the sale", () => {
    const result = allocateByExpiry([batch(1, "2027-01-10", 40)], 12);

    expect(result.allocations).toEqual([{ batchId: 1, quantity: 12 }]);
  });

  it("crosses into the next batch when the first runs out", () => {
    const batches = [batch(1, "2026-08-31", 24), batch(2, "2027-06-14", 45)];

    const result = allocateByExpiry(batches, 30);

    expect(result.allocations).toEqual([
      { batchId: 1, quantity: 24 },
      { batchId: 2, quantity: 6 },
    ]);
  });

  it("deducts from an expired batch before a valid one", () => {
    const batches = [batch(1, "2027-06-14", 40), batch(2, "2026-07-30", 10)];

    const result = allocateByExpiry(batches, 4);

    expect(result.allocations).toEqual([{ batchId: 2, quantity: 4 }]);
  });

  it("leaves batches without expiry for last", () => {
    const batches = [batch(1, null, 50), batch(2, "2027-06-14", 10)];

    const result = allocateByExpiry(batches, 12);

    expect(result.allocations).toEqual([
      { batchId: 2, quantity: 10 },
      { batchId: 1, quantity: 2 },
    ]);
  });

  it("breaks an expiry tie by the lowest id", () => {
    const batches = [batch(9, "2027-01-10", 5), batch(3, "2027-01-10", 5)];

    const result = allocateByExpiry(batches, 5);

    expect(result.allocations).toEqual([{ batchId: 3, quantity: 5 }]);
  });

  it("skips batches with no units left", () => {
    const batches = [batch(1, "2026-08-31", 0), batch(2, "2027-06-14", 20)];

    const result = allocateByExpiry(batches, 5);

    expect(result.allocations).toEqual([{ batchId: 2, quantity: 5 }]);
  });

  it("reports no shortfall when the stock covers the sale", () => {
    const result = allocateByExpiry([batch(1, "2027-01-10", 40)], 40);

    expect(result.shortfall).toBe(0);
  });

  it("reports the shortfall when the sale exceeds the stock", () => {
    const batches = [batch(1, "2026-08-31", 24), batch(2, "2027-06-14", 10)];

    const result = allocateByExpiry(batches, 50);

    expect(result.shortfall).toBe(16);
  });

  it("pushes the missing units onto the last batch of the queue", () => {
    const batches = [batch(1, "2026-08-31", 24), batch(2, "2027-06-14", 10)];

    const result = allocateByExpiry(batches, 50);

    expect(result.allocations).toEqual([
      { batchId: 1, quantity: 24 },
      { batchId: 2, quantity: 26 },
    ]);
  });

  it("sells from a batch the system believes is empty", () => {
    const result = allocateByExpiry([batch(1, "2027-01-10", 0)], 3);

    expect(result.allocations).toEqual([{ batchId: 1, quantity: 3 }]);
  });

  it("allocates nothing when the product has no batches", () => {
    const result = allocateByExpiry([], 3);

    expect(result.allocations).toEqual([]);
  });

  it("reports the whole quantity as shortfall when there are no batches", () => {
    expect(allocateByExpiry([], 3).shortfall).toBe(3);
  });
});
