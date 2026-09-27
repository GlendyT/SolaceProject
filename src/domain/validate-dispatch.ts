import { DateTime } from "luxon";
import {
  dispatchRequestSchema,
  type DispatchRequest,
  type DispatchValidationResult,
} from "./dispatch-schema";

export const DEFAULT_BUSINESS_TIME_ZONE = "America/New_York";
export const SAME_DAY_PICKUP_CUTOFF_HOUR = 15;

function getCandidateOrderId(payload: unknown) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("shipperOrderId" in payload)
  )
    return null;
  const value = payload.shipperOrderId;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function parseBusinessDate(value: string, timeZone: string) {
  const parsed = DateTime.fromFormat(value, "yyyy-MM-dd", {
    zone: timeZone,
    locale: "en-US",
  });
  return parsed.isValid && parsed.toFormat("yyyy-MM-dd") === value
    ? parsed.startOf("day")
    : null;
}

function cancelled(
  shipperOrderId: string,
  reason: string,
): DispatchValidationResult {
  return {
    ok: false,
    status: "Cancelled",
    shipperOrderId,
    reason,
    result: { shipperOrderId, status: "Cancelled", notes: reason },
  };
}

export function validateDispatch(
  input: unknown,
  receivedAt: Date,
  timeZone = DEFAULT_BUSINESS_TIME_ZONE,
): DispatchValidationResult {
  const parsed = dispatchRequestSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path?.length ? ` (${issue.path.join(".")})` : "";
    const reason = issue
      ? `${issue.message}${path}`
      : "The request payload is invalid.";
    const shipperOrderId = getCandidateOrderId(input);
    return shipperOrderId
      ? cancelled(shipperOrderId, `Invalid request payload: ${reason}`)
      : {
          ok: false,
          status: "Invalid",
          shipperOrderId: null,
          reason,
        };
  }

  const payload: DispatchRequest = parsed.data;
  const pickup = parseBusinessDate(payload.pickupDate, timeZone);
  const delivery = parseBusinessDate(payload.deliveryDate, timeZone);
  if (!pickup)
    return cancelled(
      payload.shipperOrderId,
      "Pickup date is not a valid calendar date.",
    );
  if (!delivery)
    return cancelled(
      payload.shipperOrderId,
      "Delivery date is not a valid calendar date.",
    );

  const receivedLocal = DateTime.fromJSDate(receivedAt, { zone: timeZone });
  const today = receivedLocal.startOf("day");
  if (pickup < today)
    return cancelled(
      payload.shipperOrderId,
      "Pickup date cannot be earlier than the current date.",
    );

  const cutoff = today.set({
    hour: SAME_DAY_PICKUP_CUTOFF_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  if (
    payload.pickupDate === receivedLocal.toFormat("yyyy-MM-dd") &&
    receivedLocal > cutoff
  ) {
    return cancelled(
      payload.shipperOrderId,
      "Same-day pickup requests cannot be received after 3:00 p.m. US Eastern time.",
    );
  }

  if (delivery < pickup.plus({ days: 1 })) {
    return cancelled(
      payload.shipperOrderId,
      "Delivery date must be at least one calendar day after the pickup date.",
    );
  }

  return {
    ok: true,
    status: "Accepted",
    payload,
    result: {
      shipperOrderId: payload.shipperOrderId,
      status: "Accepted",
      notes:
        "You will receive an email when a carrier accepts this dispatch request",
    },
  };
}
