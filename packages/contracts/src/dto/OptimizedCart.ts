export interface OptimizedCart {
  items: { itemId: string; quantity: number }[];
  baseCost: number;
  fillerCost: number;
  discountApplied: number;
  finalTotal: number;
  savingsAchieved: number;
  couponCode?: string;
}
