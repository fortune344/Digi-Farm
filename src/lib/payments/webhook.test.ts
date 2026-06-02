import { describe, expect, it } from "vitest";
import { signWebhookPayload, verifyWebhookSignature } from "./webhook";

const body = JSON.stringify({ ref: "abc", amount: 1500, status: "success" });

describe("signature du webhook", () => {
  it("valide une signature correcte", () => {
    expect(verifyWebhookSignature(body, signWebhookPayload(body))).toBe(true);
  });

  it("rejette un corps falsifié", () => {
    const signature = signWebhookPayload(body);
    expect(verifyWebhookSignature(`${body} `, signature)).toBe(false);
  });

  it("rejette une signature absente ou erronée", () => {
    expect(verifyWebhookSignature(body, null)).toBe(false);
    expect(verifyWebhookSignature(body, "deadbeef")).toBe(false);
  });
});
