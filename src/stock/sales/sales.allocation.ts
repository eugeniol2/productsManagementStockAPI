export type AllocatableBatch = {
  id: number;
  expiresAt: Date | null;
  currentUnits: number;
};

export type Allocation = {
  batchId: number;
  quantity: number;
};

export type AllocationResult = {
  allocations: Allocation[];
  shortfall: number;
};

export function allocateByExpiry(
  batches: AllocatableBatch[],
  quantity: number,
): AllocationResult {
  const ordered = [...batches].sort(byExpiryThenId);
  const allocations: Allocation[] = [];
  let remaining = quantity;

  for (const batch of ordered) {
    if (remaining <= 0) {
      break;
    }

    const available = Math.max(0, batch.currentUnits);

    if (available === 0) {
      continue;
    }

    const taken = Math.min(remaining, available);
    allocations.push({ batchId: batch.id, quantity: taken });
    remaining -= taken;
  }

  const lastBatch = ordered.at(-1);

  if (remaining > 0 && lastBatch) {
    absorb(allocations, lastBatch.id, remaining);
  }

  return { allocations, shortfall: Math.max(0, remaining) };
}

function absorb(allocations: Allocation[], batchId: number, quantity: number) {
  const existing = allocations.find(
    (allocation) => allocation.batchId === batchId,
  );

  if (existing) {
    existing.quantity += quantity;
    return;
  }

  allocations.push({ batchId, quantity });
}

function byExpiryThenId(first: AllocatableBatch, second: AllocatableBatch) {
  if (first.expiresAt === null && second.expiresAt === null) {
    return first.id - second.id;
  }
  if (first.expiresAt === null) {
    return 1;
  }
  if (second.expiresAt === null) {
    return -1;
  }

  const byExpiry = first.expiresAt.getTime() - second.expiresAt.getTime();

  return byExpiry === 0 ? first.id - second.id : byExpiry;
}
