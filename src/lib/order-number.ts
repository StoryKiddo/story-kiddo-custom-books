/**
 * Customer-facing six-digit order numbers.
 * Internal routing still uses the UUID primary key.
 */

export const ORDER_NUMBER_MIN = 100000;
export const ORDER_NUMBER_MAX = 999999;

export function formatOrderNumberLabel(orderNumber: number): string {
  return `Order #${orderNumber}`;
}

/** Stable six-digit number for a demo preview URL. Never random during render. */
export function orderNumberFromDemoId(demoId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < demoId.length; i++) {
    hash ^= demoId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const span = ORDER_NUMBER_MAX - ORDER_NUMBER_MIN + 1;
  return ORDER_NUMBER_MIN + ((hash >>> 0) % span);
}
