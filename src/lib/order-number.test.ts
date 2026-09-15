import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatOrderNumberLabel,
  orderNumberFromDemoId,
} from "./order-number.ts";

describe("formatOrderNumberLabel", () => {
  it("displays Order # plus exactly six digits", () => {
    assert.equal(formatOrderNumberLabel(123456), "Order #123456");
    assert.equal(formatOrderNumberLabel(100000), "Order #100000");
    assert.equal(formatOrderNumberLabel(999999), "Order #999999");
  });

  it("never includes a UUID in the customer-facing label", () => {
    const label = formatOrderNumberLabel(246801);
    assert.match(label, /^Order #\d{6}$/);
    assert.equal(label.includes("-"), false);
    assert.equal(/\b[0-9a-f]{8}-[0-9a-f]{4}\b/i.test(label), false);
  });
});

describe("orderNumberFromDemoId", () => {
  it("derives a stable six-digit number in range from a demo id", () => {
    const demoId = "demo-11111111-1111-4111-8111-111111111111";
    const first = orderNumberFromDemoId(demoId);
    const second = orderNumberFromDemoId(demoId);

    assert.equal(first, second);
    assert.ok(first >= 100000 && first <= 999999);
    assert.equal(String(first).length, 6);
    assert.match(formatOrderNumberLabel(first), /^Order #\d{6}$/);
  });

  it("does not use random values across a given demo URL", () => {
    const other = orderNumberFromDemoId(
      "demo-22222222-2222-4222-8222-222222222222",
    );
    const original = orderNumberFromDemoId(
      "demo-11111111-1111-4111-8111-111111111111",
    );
    assert.notEqual(original, other);
    assert.equal(
      orderNumberFromDemoId("demo-11111111-1111-4111-8111-111111111111"),
      original,
    );
  });
});
