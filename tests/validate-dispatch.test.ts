import { describe, expect, it } from "vitest";
import { validateDispatch } from "@/domain/validate-dispatch";
import type { DispatchRequest } from "@/domain/dispatch-schema";

const validPayload: DispatchRequest = {
  shipperOrderId: "6600111",
  pickupDate: "2026-09-23",
  deliveryDate: "2026-09-24",
  price: 900,
  stops: [
    { stopNumber: 1, city: "Milford", state: "MA", postalCode: "01757" },
    { stopNumber: 2, city: "Shippensburg", state: "PA", postalCode: "17257" },
  ],
  vehicles: [{ year: "2010", make: "Toyota", model: "Corolla" }],
  transportationReleaseNotes: "Verify the pickup date.",
};

describe("validateDispatch", () => {
  it("accepts a future pickup with at least one calendar day before delivery", () => {
    const result = validateDispatch(validPayload, new Date("2026-09-22T20:00:00.000Z"));
    expect(result.ok).toBe(true);
    expect(result.status).toBe("Accepted");
  });

  it("cancels a pickup earlier than today", () => {
    const result = validateDispatch({ ...validPayload, pickupDate: "2026-09-21" }, new Date("2026-09-22T14:00:00.000Z"));
    expect(result).toMatchObject({ status: "Cancelled", reason: "Pickup date cannot be earlier than the current date." });
  });

  it("cancels today's pickup after the 3 p.m. cutoff", () => {
    const result = validateDispatch({ ...validPayload, pickupDate: "2026-09-22", deliveryDate: "2026-09-23" }, new Date("2026-09-22T19:01:00.000Z"));
    expect(result).toMatchObject({ status: "Cancelled" });
    if (!result.ok) expect(result.reason).toContain("after 3:00 p.m.");
  });

  it("cancels delivery on the same day as pickup", () => {
    const result = validateDispatch({ ...validPayload, deliveryDate: validPayload.pickupDate }, new Date("2026-09-22T14:00:00.000Z"));
    expect(result).toMatchObject({ status: "Cancelled" });
    if (!result.ok) expect(result.reason).toContain("at least one calendar day");
  });

  it("returns invalid when there is no usable order id", () => {
    const result = validateDispatch({ pickupDate: "not-a-date" }, new Date("2026-09-22T14:00:00.000Z"));
    expect(result).toMatchObject({ status: "Invalid", shipperOrderId: null });
  });
});
