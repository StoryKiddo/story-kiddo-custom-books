/**
 * Checkout placeholder routing. Payment is not implemented; these helpers
 * only validate the order query param so links back to /order/[id] stay safe.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEMO_ID_PATTERN =
  /^demo-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstValue(
  value: string | string[] | undefined,
): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function allValues(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseCheckoutOrderId(
  value: string | string[] | undefined,
): string | null {
  const raw = firstValue(value)?.trim();
  if (!raw) return null;
  if (UUID_PATTERN.test(raw) || DEMO_ID_PATTERN.test(raw)) return raw;
  return null;
}

export function checkoutHref(input: {
  id: string;
  isDemo: boolean;
  trackSlug?: string;
  children?: { name: string; age: number }[];
}): string {
  const params = new URLSearchParams();
  params.set("order", input.id);
  if (input.isDemo) {
    params.set("demo", "1");
    if (input.trackSlug) params.set("track", input.trackSlug);
    for (const child of input.children ?? []) {
      params.append("childName", child.name);
      params.append("childAge", String(child.age));
    }
  }
  return `/checkout?${params.toString()}`;
}

export function previewHrefFromCheckoutQuery(
  searchParams: Record<string, string | string[] | undefined>,
): string | null {
  const orderId = parseCheckoutOrderId(searchParams.order);
  if (!orderId) return null;

  if (!orderId.startsWith("demo-")) {
    return `/order/${orderId}`;
  }

  const params = new URLSearchParams();
  const demo = firstValue(searchParams.demo);
  if (demo) params.set("demo", demo);
  const track = firstValue(searchParams.track);
  if (track) params.set("track", track);

  const names = allValues(searchParams.childName);
  const ages = allValues(searchParams.childAge);
  for (const name of names) params.append("childName", name);
  for (const age of ages) params.append("childAge", age);

  const query = params.toString();
  return query ? `/order/${orderId}?${query}` : `/order/${orderId}`;
}
