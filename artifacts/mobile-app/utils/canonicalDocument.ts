export type CanonicalAmountLike = Readonly<{
  literal: string;
  role?: string | null;
}>;

const PRIMARY_AMOUNT_ROLES = [
  'payout_amount',
  'net_amount',
  'amount_due',
  'total_due',
  'payable_amount',
  'payable',
];

/** Selects the canonical list item intended for the document's main amount UI. */
export function primaryCanonicalAmount<T extends CanonicalAmountLike>(amounts: readonly T[]): T | undefined {
  return amounts.find((amount) => PRIMARY_AMOUNT_ROLES.includes(amount.role?.toLowerCase() ?? '')) ?? amounts[0];
}