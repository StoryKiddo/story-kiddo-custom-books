import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkoutHref,
  parseCheckoutOrderId,
  previewHrefFromCheckoutQuery,
} from "./checkout-order.ts";

const uuid = "a1111111-1111-4111-8111-111111111111";
const demoId = "demo-11111111-1111-4111-8111-111111111111";

describe("parseCheckoutOrderId", () => {
  it("accepts an internal UUID", () => {
    assert.equal(parseCheckoutOrderId(uuid), uuid);
  });

  it("accepts a demo id", () => {
    assert.equal(parseCheckoutOrderId(demoId), demoId);
  });

  it("rejects missing, empty, and unsafe values", () => {
    assert.equal(parseCheckoutOrderId(undefined), null);
    assert.equal(parseCheckoutOrderId(""), null);
    assert.equal(parseCheckoutOrderId("../etc/passwd"), null);
    assert.equal(parseCheckoutOrderId("demo-../x"), null);
    assert.equal(parseCheckoutOrderId("not-an-id"), null);
  });
});

describe("checkoutHref and preview round-trip", () => {
  it("puts only the UUID in the checkout query for saved orders", () => {
    assert.equal(checkoutHref({ id: uuid, isDemo: false }), `/checkout?order=${uuid}`);
  });

  it("lets a demo preview reach checkout with its demo id and return safely", () => {
    const href = checkoutHref({
      id: demoId,
      isDemo: true,
      trackSlug: "alphabet",
      children: [
        { name: "Dylan", age: 4 },
        { name: "Mia", age: 6 },
      ],
    });
    assert.equal(href.startsWith("/checkout?"), true);
    assert.equal(href.includes(`order=${demoId}`), true);

    const params = new URL(href, "https://storykiddo.test").searchParams;
    const record: Record<string, string | string[]> = {};
    for (const key of params.keys()) {
      const values = params.getAll(key);
      record[key] = values.length === 1 ? values[0] : values;
    }

    const preview = previewHrefFromCheckoutQuery(record);
    assert.equal(preview?.startsWith(`/order/${demoId}?`), true);
    assert.equal(preview?.includes("order="), false);
    assert.ok(preview?.includes("demo=1"));
    assert.ok(preview?.includes("track=alphabet"));
    assert.ok(preview?.includes("childName=Dylan"));
    assert.ok(preview?.includes("childName=Mia"));
    assert.ok(preview?.includes("childAge=4"));
  });

  it("links a saved order back to /order/[id] without extra query params", () => {
    assert.equal(
      previewHrefFromCheckoutQuery({ order: uuid }),
      `/order/${uuid}`,
    );
  });
});
