import type { ProductCandidate } from '@cart/shared';

export type CandidateMatch = {
  product: ProductCandidate;
  convertedSizeValue: number | null;
};
